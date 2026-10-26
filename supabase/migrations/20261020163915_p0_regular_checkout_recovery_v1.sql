begin;

-- P0 Ready Stock recovery; additive compatibility for the audited production
-- and staging signatures. No historical order, stock or payment mutation.

create or replace function public.is_verified_registered_customer_checkout_v1(
  p_customer_user_id uuid,
  p_customer_email text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from auth.users customer_user
    join public.customer_profiles customer_profile
      on customer_profile.id = customer_user.id
    left join public.profiles internal_profile
      on internal_profile.id = customer_user.id
    where customer_user.id = p_customer_user_id
      and customer_user.confirmation_sent_at is not null
      and customer_user.email_confirmed_at is not null
      and customer_user.email_confirmed_at >= customer_user.confirmation_sent_at
      and customer_user.raw_app_meta_data ->> 'account_type' = 'customer'
      and customer_user.raw_app_meta_data ->> 'signup_channel' = 'debroder_public_v1'
      and nullif(customer_user.raw_app_meta_data ->> 'terms_accepted_at', '') is not null
      and customer_profile.account_status = 'ACTIVE'
      and internal_profile.id is null
      and lower(btrim(coalesce(customer_user.email, ''))) =
          lower(btrim(coalesce(p_customer_email, '')))
  )
$$;

create or replace function public.checkout_phone_limit_applies_v1(
  p_customer_email text
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  context_value text := nullif(
    pg_catalog.current_setting('debroder.registered_customer_user_id', true),
    ''
  );
  context_customer_id uuid;
begin
  if context_value is null then
    return true;
  end if;

  begin
    context_customer_id := context_value::uuid;
  exception
    when invalid_text_representation then
      return true;
  end;

  return not public.is_verified_registered_customer_checkout_v1(
    context_customer_id,
    p_customer_email
  );
end;
$$;

revoke all on function public.is_verified_registered_customer_checkout_v1(uuid,text)
from public, anon, authenticated;
revoke all on function public.checkout_phone_limit_applies_v1(text)
from public, anon, authenticated;
grant execute on function public.is_verified_registered_customer_checkout_v1(uuid,text)
to service_role;
grant execute on function public.checkout_phone_limit_applies_v1(text)
to service_role;


-- Reconcile only the existing Ready Stock creator. Fail closed on unknown
-- definitions; keep pricing, stock, validation and all existing ACLs intact.
do $recovery$
declare
  original text;
  patched text;
begin
  select pg_catalog.pg_get_functiondef(
    'public.create_public_checkout_order(text,text,text,text,text,text,text,text,uuid,text,text,jsonb)'::regprocedure
  ) into original;
  patched := original;
  if pg_catalog.strpos(patched, 'pg_catalog.pg_advisory_xact_lock') = 0 then
    if pg_catalog.strpos(patched, '  select * into existing_order from public.orders where public_idempotency_key = p_idempotency_key;') = 0 then
      raise exception 'P0 checkout idempotency guard target not found';
    end if;
    patched := pg_catalog.replace(patched,
      '  select * into existing_order from public.orders where public_idempotency_key = p_idempotency_key;',
      E'  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(''ready-stock-checkout:'' || p_idempotency_key, 0));\n  select * into existing_order from public.orders where public_idempotency_key = p_idempotency_key;');
  end if;
  if pg_catalog.strpos(patched, 'public.checkout_phone_limit_applies_v1(p_customer_email)') = 0 then
    if pg_catalog.strpos(patched, 'if active_unpaid >= 2 then') = 0 then
      raise exception 'P0 checkout phone guard target not found';
    end if;
    patched := pg_catalog.replace(patched, 'if active_unpaid >= 2 then',
      'if active_unpaid >= 2 and public.checkout_phone_limit_applies_v1(p_customer_email) then');
  end if;
  if pg_catalog.strpos(patched, 'shipping_cost=case when p_delivery_method=') = 0 then
    if pg_catalog.strpos(patched, 'set subtotal_amount=subtotal_value,total_amount=subtotal_value,') = 0 then
      raise exception 'P0 checkout shipping total target not found';
    end if;
    patched := pg_catalog.replace(patched,
      'set subtotal_amount=subtotal_value,total_amount=subtotal_value,',
      E'set subtotal_amount=subtotal_value,total_amount=subtotal_value,\n      shipping_cost=case when p_delivery_method=''pickup'' then 0 else null end,');
  end if;
  if patched <> original then execute patched; end if;
end;
$recovery$;

create or replace function public.create_public_checkout_order(
  p_idempotency_key text,
  p_access_token_hash text,
  p_whatsapp_confirmation_hash text,
  p_customer_name text,
  p_customer_phone text,
  p_customer_email text,
  p_delivery_method text,
  p_shipping_address text,
  p_pickup_location_id uuid,
  p_payment_method text,
  p_customer_notes text,
  p_items jsonb,
  p_shipping_address_snapshot jsonb,
  p_customer_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_verified_registered_customer_checkout_v1(
    p_customer_user_id,
    p_customer_email
  ) then
    raise exception 'Akun pelanggan terverifikasi tidak valid';
  end if;

  perform pg_catalog.set_config(
    'debroder.registered_customer_user_id',
    p_customer_user_id::text,
    true
  );

  return public.create_public_checkout_order(
    p_idempotency_key,
    p_access_token_hash,
    p_whatsapp_confirmation_hash,
    p_customer_name,
    p_customer_phone,
    p_customer_email,
    p_delivery_method,
    p_shipping_address,
    p_pickup_location_id,
    p_payment_method,
    p_customer_notes,
    p_items,
    p_shipping_address_snapshot
  );
end;
$$;

create or replace function public.create_public_instant_checkout_order(
  p_idempotency_key text,
  p_access_token_hash text,
  p_whatsapp_confirmation_hash text,
  p_customer_name text,
  p_customer_phone text,
  p_customer_email text,
  p_delivery_method text,
  p_shipping_address text,
  p_pickup_location_id uuid,
  p_payment_method text,
  p_customer_notes text,
  p_items jsonb,
  p_shipping_address_snapshot jsonb,
  p_customer_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_verified_registered_customer_checkout_v1(
    p_customer_user_id,
    p_customer_email
  ) then
    raise exception 'Akun pelanggan terverifikasi tidak valid';
  end if;

  perform pg_catalog.set_config(
    'debroder.registered_customer_user_id',
    p_customer_user_id::text,
    true
  );

  return public.create_public_instant_checkout_order(
    p_idempotency_key,
    p_access_token_hash,
    p_whatsapp_confirmation_hash,
    p_customer_name,
    p_customer_phone,
    p_customer_email,
    p_delivery_method,
    p_shipping_address,
    p_pickup_location_id,
    p_payment_method,
    p_customer_notes,
    p_items,
    p_shipping_address_snapshot
  );
end;
$$;

revoke all on function public.create_public_checkout_order(text,text,text,text,text,text,text,text,uuid,text,text,jsonb,jsonb,uuid) from public, anon, authenticated;
grant execute on function public.create_public_checkout_order(text,text,text,text,text,text,text,text,uuid,text,text,jsonb,jsonb,uuid) to service_role;

revoke all on function public.create_public_instant_checkout_order(text,text,text,text,text,text,text,text,uuid,text,text,jsonb,jsonb,uuid) from public, anon, authenticated;
grant execute on function public.create_public_instant_checkout_order(text,text,text,text,text,text,text,text,uuid,text,text,jsonb,jsonb,uuid) to service_role;

notify pgrst, 'reload schema';
commit;
