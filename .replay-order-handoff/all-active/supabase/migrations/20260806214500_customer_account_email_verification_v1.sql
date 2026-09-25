begin;

create table if not exists public.customer_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null,
  phone text,
  account_status text not null default 'ACTIVE',
  email_verified_at timestamptz not null,
  terms_accepted_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customer_profiles_email_check check (
    email = lower(btrim(email))
    and email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
  ),
  constraint customer_profiles_name_check check (char_length(btrim(full_name)) between 2 and 150),
  constraint customer_profiles_phone_check check (
    phone is null or regexp_replace(phone, '[^0-9]', '', 'g') ~ '^[0-9]{9,15}$'
  ),
  constraint customer_profiles_status_check check (account_status in ('ACTIVE','SUSPENDED','CLOSED'))
);

create unique index if not exists customer_profiles_normalized_email_unique_idx
  on public.customer_profiles(lower(btrim(email)));

create table if not exists public.customer_addresses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customer_profiles(id) on delete cascade,
  label text not null default 'Alamat Utama',
  recipient_name text not null,
  recipient_phone text not null,
  province_code text not null,
  regency_code text not null,
  district_code text not null,
  village_code text not null,
  postal_code text not null,
  address_detail text not null,
  house_number text,
  rt text,
  rw text,
  landmark text,
  courier_note text,
  formatted_address text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customer_addresses_label_check check (char_length(btrim(label)) between 2 and 60),
  constraint customer_addresses_recipient_name_check check (char_length(btrim(recipient_name)) between 2 and 150),
  constraint customer_addresses_recipient_phone_check check (
    regexp_replace(recipient_phone, '[^0-9]', '', 'g') ~ '^[0-9]{9,15}$'
  ),
  constraint customer_addresses_region_check check (
    province_code ~ '^[0-9A-Za-z.-]{1,24}$'
    and regency_code ~ '^[0-9A-Za-z.-]{1,24}$'
    and district_code ~ '^[0-9A-Za-z.-]{1,24}$'
    and village_code ~ '^[0-9A-Za-z.-]{1,24}$'
  ),
  constraint customer_addresses_postal_check check (postal_code ~ '^[0-9]{5}$'),
  constraint customer_addresses_detail_check check (char_length(btrim(address_detail)) between 5 and 500),
  constraint customer_addresses_rt_check check (rt is null or rt ~ '^[0-9]{1,3}$'),
  constraint customer_addresses_rw_check check (rw is null or rw ~ '^[0-9]{1,3}$')
);

create index if not exists customer_addresses_customer_idx
  on public.customer_addresses(customer_id, created_at desc);

create unique index if not exists customer_addresses_one_default_idx
  on public.customer_addresses(customer_id)
  where is_default;

alter table public.orders
  add column if not exists customer_user_id uuid references auth.users(id) on delete set null;

create index if not exists orders_customer_user_created_idx
  on public.orders(customer_user_id, created_at desc)
  where customer_user_id is not null and archived_at is null;

create or replace function public.guard_customer_profile_identity_v1()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.id is distinct from old.id or lower(btrim(new.email)) is distinct from lower(btrim(old.email)) then
    raise exception 'Identitas akun pelanggan tidak dapat diubah melalui profil';
  end if;
  new.email := lower(btrim(new.email));
  new.full_name := btrim(new.full_name);
  new.phone := nullif(regexp_replace(coalesce(new.phone, ''), '[^0-9]', '', 'g'), '');
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists guard_customer_profile_identity_v1 on public.customer_profiles;
create trigger guard_customer_profile_identity_v1
before update on public.customer_profiles
for each row execute function public.guard_customer_profile_identity_v1();

drop trigger if exists set_customer_addresses_updated_at on public.customer_addresses;
create trigger set_customer_addresses_updated_at
before update on public.customer_addresses
for each row execute function public.set_updated_at();

create or replace function public.customer_email_is_internal_v1(p_email text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists(
    select 1
    from public.profiles
    where lower(btrim(coalesce(email, ''))) = lower(btrim(coalesce(p_email, '')))
  );
$$;

create or replace function public.activate_public_checkout_order_v1(
  p_order_id uuid,
  p_customer_user_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  order_row public.orders;
  next_status text;
  verified_email text;
  verified_at timestamptz;
  profile_status text;
  caller_role text := coalesce(auth.role(), '');
  changed boolean := false;
begin
  if caller_role <> 'service_role'
    and not public.has_permission('order.edit')
    and not public.has_staff_role(array['owner','superadmin','super_admin','sales_admin','admin']) then
    raise exception 'Tidak berwenang mengaktifkan pesanan publik';
  end if;

  select * into order_row
  from public.orders
  where id = p_order_id and archived_at is null
  for update;

  if not found then
    raise exception 'Pesanan tidak ditemukan';
  end if;

  if p_customer_user_id is not null then
    select lower(btrim(email)), email_confirmed_at
      into verified_email, verified_at
    from auth.users
    where id = p_customer_user_id
      and confirmation_sent_at is not null
      and email_confirmed_at is not null
      and email_confirmed_at >= confirmation_sent_at
      and raw_app_meta_data ->> 'account_type' = 'customer'
      and raw_app_meta_data ->> 'signup_channel' = 'debroder_public_v1'
      and nullif(raw_app_meta_data ->> 'terms_accepted_at', '') is not null;

    if verified_email is null or verified_at is null then
      raise exception 'Email akun pelanggan belum terverifikasi';
    end if;

    if exists(select 1 from public.profiles where id = p_customer_user_id) then
      raise exception 'Akun internal tidak dapat digunakan sebagai akun pelanggan';
    end if;

    select account_status into profile_status
    from public.customer_profiles
    where id = p_customer_user_id;

    if profile_status is distinct from 'ACTIVE' then
      raise exception 'Akun pelanggan tidak aktif';
    end if;

    if lower(btrim(coalesce(order_row.customer_email, ''))) <> verified_email then
      raise exception 'Email checkout tidak sama dengan email akun terverifikasi';
    end if;

    if order_row.customer_user_id is not null and order_row.customer_user_id <> p_customer_user_id then
      raise exception 'Pesanan sudah terhubung ke akun pelanggan lain';
    end if;

    if order_row.customer_user_id is null then
      order_row.customer_user_id := p_customer_user_id;
      changed := true;
    end if;
  end if;

  if order_row.whatsapp_confirmed_at is null then
    order_row.whatsapp_confirmed_at := now();
    order_row.whatsapp_confirmed_by := p_customer_user_id;
    order_row.whatsapp_confirmation_hash := null;
    order_row.whatsapp_confirmation_expires_at := null;
    order_row.whatsapp_confirmation_attempts := 0;
    changed := true;
  end if;

  if order_row.status = 'pending_confirmation' then
    if order_row.delivery_method = 'pickup' then
      perform public.reserve_public_order_stock(p_order_id, interval '12 hours', p_customer_user_id);
      next_status := case
        when order_row.payment_method = 'pay_at_store' then 'processing'
        else 'awaiting_payment'
      end;
    else
      next_status := 'awaiting_shipping_quote';
    end if;

    insert into public.order_status_history(order_id, from_status, to_status, note, changed_by)
    values(
      p_order_id,
      'pending_confirmation',
      next_status,
      'Checkout web diaktifkan otomatis. Verifikasi WhatsApp tidak digunakan.',
      p_customer_user_id
    );

    order_row.status := next_status;
    changed := true;
  end if;

  if changed then
    update public.orders
    set customer_user_id = order_row.customer_user_id,
        status = order_row.status,
        whatsapp_confirmed_at = order_row.whatsapp_confirmed_at,
        whatsapp_confirmed_by = order_row.whatsapp_confirmed_by,
        whatsapp_confirmation_hash = order_row.whatsapp_confirmation_hash,
        whatsapp_confirmation_expires_at = order_row.whatsapp_confirmation_expires_at,
        whatsapp_confirmation_attempts = order_row.whatsapp_confirmation_attempts,
        source_snapshot = coalesce(source_snapshot, '{}'::jsonb) || jsonb_build_object(
          'contact_confirmation', 'web_checkout_auto',
          'customer_user_id', order_row.customer_user_id
        ),
        updated_by = coalesce(p_customer_user_id, auth.uid()),
        updated_at = now()
    where id = p_order_id
    returning * into order_row;

    insert into public.system_audit_log(
      entity_type, entity_id, action, actor_id, actor_role, source, new_value
    ) values (
      'order', p_order_id, 'public_checkout_auto_activated', p_customer_user_id,
      case when p_customer_user_id is null then 'guest_customer' else 'customer' end,
      'customer_account_v1',
      jsonb_build_object(
        'status', order_row.status,
        'customer_user_id', order_row.customer_user_id,
        'verification_channel', 'email_or_checkout'
      )
    );
  end if;

  return jsonb_build_object(
    'order_id', order_row.id,
    'order_number', order_row.order_number,
    'status', order_row.status,
    'customer_user_id', order_row.customer_user_id,
    'activated', order_row.whatsapp_confirmed_at is not null
  );
end;
$$;

create or replace function public.claim_verified_customer_orders_v1(
  p_customer_user_id uuid
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  verified_email text;
  verified_at timestamptz;
  claimed_count integer := 0;
  caller_role text := coalesce(auth.role(), '');
begin
  if caller_role <> 'service_role' and auth.uid() is distinct from p_customer_user_id then
    raise exception 'Tidak berwenang menghubungkan pesanan pelanggan';
  end if;

  select lower(btrim(email)), email_confirmed_at
    into verified_email, verified_at
  from auth.users
  where id = p_customer_user_id
    and confirmation_sent_at is not null
    and email_confirmed_at is not null
    and email_confirmed_at >= confirmation_sent_at
    and raw_app_meta_data ->> 'account_type' = 'customer'
    and raw_app_meta_data ->> 'signup_channel' = 'debroder_public_v1'
    and nullif(raw_app_meta_data ->> 'terms_accepted_at', '') is not null;

  if verified_email is null or verified_at is null then
    raise exception 'Email akun pelanggan belum terverifikasi';
  end if;

  if exists(select 1 from public.profiles where id = p_customer_user_id) then
    raise exception 'Akun internal tidak dapat mengklaim pesanan pelanggan';
  end if;

  if not exists(
    select 1 from public.customer_profiles
    where id = p_customer_user_id and account_status = 'ACTIVE'
  ) then
    raise exception 'Profil pelanggan belum aktif';
  end if;

  update public.orders
  set customer_user_id = p_customer_user_id,
      source_snapshot = coalesce(source_snapshot, '{}'::jsonb) || jsonb_build_object(
        'claimed_by_verified_email_at', now(),
        'customer_user_id', p_customer_user_id
      ),
      updated_at = now()
  where customer_user_id is null
    and archived_at is null
    and lower(btrim(coalesce(customer_email, ''))) = verified_email;

  get diagnostics claimed_count = row_count;
  return claimed_count;
end;
$$;

alter table public.customer_profiles enable row level security;
alter table public.customer_addresses enable row level security;

revoke all on public.customer_profiles from public, anon;
revoke all on public.customer_addresses from public, anon;

grant select on public.customer_profiles to authenticated;
grant select on public.customer_addresses to authenticated;

drop policy if exists "Customer reads own profile" on public.customer_profiles;
create policy "Customer reads own profile"
on public.customer_profiles
for select
to authenticated
using (id = auth.uid());

drop policy if exists "Customer updates own profile" on public.customer_profiles;
create policy "Customer updates own profile"
on public.customer_profiles
for update
to authenticated
using (id = auth.uid() and account_status = 'ACTIVE')
with check (id = auth.uid() and account_status = 'ACTIVE');

drop policy if exists "Customer reads own addresses" on public.customer_addresses;
create policy "Customer reads own addresses"
on public.customer_addresses
for select
to authenticated
using (customer_id = auth.uid());

drop policy if exists "Customer inserts own addresses" on public.customer_addresses;
create policy "Customer inserts own addresses"
on public.customer_addresses
for insert
to authenticated
with check (customer_id = auth.uid());

drop policy if exists "Customer updates own addresses" on public.customer_addresses;
create policy "Customer updates own addresses"
on public.customer_addresses
for update
to authenticated
using (customer_id = auth.uid())
with check (customer_id = auth.uid());

drop policy if exists "Customer deletes own addresses" on public.customer_addresses;
create policy "Customer deletes own addresses"
on public.customer_addresses
for delete
to authenticated
using (customer_id = auth.uid());

drop policy if exists "Customer reads own orders" on public.orders;
create policy "Customer reads own orders"
on public.orders
for select
to authenticated
using (customer_user_id = auth.uid() and archived_at is null);

-- Existing Store Admin scope is a restrictive policy. Give verified customers
-- a narrow path through that guard only for their own non-archived orders.
drop policy if exists "global dashboard store scope orders" on public.orders;
create policy "global dashboard store scope orders"
on public.orders as restrictive
for select
to authenticated
using (
  (customer_user_id = auth.uid() and archived_at is null)
  or (
    public.current_actor_role() is not null
    and (
      public.current_actor_role() <> 'store_admin'
      or public.can_access_order(id)
    )
  )
);

-- This existing ALL policy is also restrictive and therefore participates in
-- SELECT evaluation. Keep its staff write scope unchanged while opening only
-- the same narrow customer read path in USING. Customers still have no
-- permissive INSERT/UPDATE/DELETE policy on orders.
drop policy if exists "rbac store scope orders" on public.orders;
create policy "rbac store scope orders"
on public.orders as restrictive
for all
to authenticated
using (
  (customer_user_id = auth.uid() and archived_at is null)
  or (
    public.current_actor_role() is not null
    and (
      public.current_actor_role() <> 'store_admin'
      or public.can_access_order(id)
    )
  )
)
with check (
  public.current_actor_role() is not null
  and (
    public.current_actor_role() <> 'store_admin'
    or public.can_access_order(id)
  )
);

revoke all on function public.customer_email_is_internal_v1(text) from public, anon, authenticated;
grant execute on function public.customer_email_is_internal_v1(text) to service_role;

revoke all on function public.activate_public_checkout_order_v1(uuid,uuid) from public, anon;
grant execute on function public.activate_public_checkout_order_v1(uuid,uuid) to authenticated, service_role;

revoke all on function public.claim_verified_customer_orders_v1(uuid) from public, anon;
grant execute on function public.claim_verified_customer_orders_v1(uuid) to authenticated, service_role;

commit;
