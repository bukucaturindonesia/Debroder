begin;

alter table public.orders
  add column if not exists checkout_activated_at timestamptz,
  add column if not exists checkout_activated_by uuid,
  add column if not exists checkout_activation_source text;

do $$
begin
  alter table public.orders
    add constraint orders_checkout_activation_integrity_v2_check
    check (
      (checkout_activated_at is null and checkout_activated_by is null and checkout_activation_source is null)
      or (
        checkout_activated_at is not null
        and checkout_activation_source in (
          'public_checkout_auto',
          'checkout_recovery',
          'public_order_recovery',
          'customer_account',
          'admin_recovery',
          'legacy_wrapper',
          'legacy_backfill',
          'legacy_compatibility'
        )
      )
    ) not valid;
exception
  when duplicate_object then null;
end
$$;

update public.orders
set checkout_activated_at = whatsapp_confirmed_at,
    checkout_activated_by = whatsapp_confirmed_by,
    checkout_activation_source = 'legacy_backfill'
where checkout_activated_at is null
  and whatsapp_confirmed_at is not null;

alter table public.orders
  validate constraint orders_checkout_activation_integrity_v2_check;

create index if not exists orders_checkout_activated_at_idx
  on public.orders(checkout_activated_at)
  where checkout_activated_at is not null and archived_at is null;

create or replace function public.enforce_checkout_activation_integrity_v2()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Compatibility bridge: any still-reachable legacy writer is immediately
  -- projected into the canonical activation contract.
  if new.checkout_activated_at is null and new.whatsapp_confirmed_at is not null then
    new.checkout_activated_at := new.whatsapp_confirmed_at;
    new.checkout_activated_by := coalesce(new.checkout_activated_by, new.whatsapp_confirmed_by);
    new.checkout_activation_source := coalesce(new.checkout_activation_source, 'legacy_compatibility');
  end if;

  if new.checkout_activated_at is not null then
    if new.checkout_activation_source is null then
      raise exception 'Sumber aktivasi checkout wajib dicatat';
    end if;

    -- Keep old database functions operational during the migration window,
    -- without allowing legacy WhatsApp state to remain the business authority.
    new.whatsapp_confirmed_at := coalesce(new.whatsapp_confirmed_at, new.checkout_activated_at);
    new.whatsapp_confirmed_by := coalesce(new.whatsapp_confirmed_by, new.checkout_activated_by);
    new.whatsapp_confirmation_hash := null;
    new.whatsapp_confirmation_expires_at := null;
    new.whatsapp_confirmation_attempts := 0;
  end if;

  if tg_op = 'UPDATE' and old.checkout_activated_at is not null then
    if new.checkout_activated_at is distinct from old.checkout_activated_at
      or new.checkout_activated_by is distinct from old.checkout_activated_by
      or new.checkout_activation_source is distinct from old.checkout_activation_source then
      raise exception 'Aktivasi checkout bersifat immutable';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists orders_checkout_activation_integrity_v2 on public.orders;
create trigger orders_checkout_activation_integrity_v2
before insert or update on public.orders
for each row execute function public.enforce_checkout_activation_integrity_v2();

create or replace function public.activate_public_checkout_order_v2(
  p_order_id uuid,
  p_customer_user_id uuid default null,
  p_activation_source text default 'public_checkout_auto'
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
  activated_at_value timestamptz;
begin
  if p_activation_source not in (
    'public_checkout_auto',
    'checkout_recovery',
    'public_order_recovery',
    'customer_account',
    'admin_recovery',
    'legacy_wrapper'
  ) then
    raise exception 'Sumber aktivasi checkout tidak valid';
  end if;

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

  if order_row.status in ('cancelled','dibatalkan','expired','completed','selesai') then
    raise exception 'Pesanan terminal tidak dapat diaktifkan';
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

  if order_row.checkout_activated_at is null then
    activated_at_value := now();
    order_row.checkout_activated_at := activated_at_value;
    order_row.checkout_activated_by := coalesce(p_customer_user_id, auth.uid());
    order_row.checkout_activation_source := p_activation_source;
    changed := true;
  else
    activated_at_value := order_row.checkout_activated_at;
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
      'Checkout web diaktifkan otomatis.',
      p_customer_user_id
    );

    order_row.status := next_status;
    changed := true;
  end if;

  if changed then
    update public.orders
    set customer_user_id = order_row.customer_user_id,
        status = order_row.status,
        checkout_activated_at = order_row.checkout_activated_at,
        checkout_activated_by = order_row.checkout_activated_by,
        checkout_activation_source = order_row.checkout_activation_source,
        -- Temporary compatibility mirror for old database functions. The
        -- trigger clears every obsolete challenge field on the same write.
        whatsapp_confirmed_at = coalesce(whatsapp_confirmed_at, order_row.checkout_activated_at),
        whatsapp_confirmed_by = coalesce(whatsapp_confirmed_by, order_row.checkout_activated_by),
        source_snapshot = coalesce(source_snapshot, '{}'::jsonb) || jsonb_build_object(
          'checkout_activation', jsonb_build_object(
            'activated_at', order_row.checkout_activated_at,
            'source', order_row.checkout_activation_source,
            'customer_user_id', order_row.customer_user_id
          )
        ),
        updated_by = coalesce(p_customer_user_id, auth.uid()),
        updated_at = now()
    where id = p_order_id
    returning * into order_row;

    insert into public.system_audit_log(
      entity_type, entity_id, action, actor_id, actor_role, source, new_value
    ) values (
      'order', p_order_id, 'public_checkout_activated', p_customer_user_id,
      case when p_customer_user_id is null then 'guest_customer' else 'customer' end,
      'checkout_activation_v2',
      jsonb_build_object(
        'status', order_row.status,
        'customer_user_id', order_row.customer_user_id,
        'checkout_activated_at', order_row.checkout_activated_at,
        'checkout_activation_source', order_row.checkout_activation_source
      )
    );
  end if;

  return jsonb_build_object(
    'order_id', order_row.id,
    'order_number', order_row.order_number,
    'status', order_row.status,
    'customer_user_id', order_row.customer_user_id,
    'checkout_activated_at', order_row.checkout_activated_at,
    'checkout_activation_source', order_row.checkout_activation_source,
    'activated', order_row.checkout_activated_at is not null
  );
end;
$$;

-- Preserve callers that still use the V1 signature, but make V2 the single
-- implementation authority.
create or replace function public.activate_public_checkout_order_v1(
  p_order_id uuid,
  p_customer_user_id uuid default null
)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select public.activate_public_checkout_order_v2(
    p_order_id,
    p_customer_user_id,
    'legacy_wrapper'
  )
$$;

revoke all on function public.enforce_checkout_activation_integrity_v2() from public, anon, authenticated;
revoke all on function public.activate_public_checkout_order_v2(uuid,uuid,text) from public, anon;
grant execute on function public.activate_public_checkout_order_v2(uuid,uuid,text) to authenticated, service_role;

revoke all on function public.activate_public_checkout_order_v1(uuid,uuid) from public, anon;
grant execute on function public.activate_public_checkout_order_v1(uuid,uuid) to authenticated, service_role;

commit;
