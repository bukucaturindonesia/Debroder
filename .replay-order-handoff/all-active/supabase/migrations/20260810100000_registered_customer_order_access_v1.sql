begin;

-- Registered customers may create independent orders without inheriting the
-- guest anti-abuse cap. Guest checkout keeps the existing per-phone limit.
-- Every original checkout function remains the authority for idempotency,
-- stock, pricing, SKU, Custom/Jersey validation, and order creation.

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

-- Patch only the three active order creators that own the legacy guest cap.
-- The migration fails closed if an expected function cannot be identified.
do $registered_customer_limit_patch$
declare
  function_row record;
  function_definition text;
  patched_definition text;
  required_function text;
begin
  for function_row in
    select proc.oid, proc.proname
    from pg_catalog.pg_proc proc
    join pg_catalog.pg_namespace ns
      on ns.oid = proc.pronamespace
    where ns.nspname = 'public'
      and proc.proname in (
        'create_public_checkout_order',
        'create_public_custom_checkout_order',
        'create_public_configured_checkout_order'
      )
      and pg_catalog.pg_get_functiondef(proc.oid) like
          '%Maksimal dua pesanan belum dibayar per nomor WhatsApp%'
  loop
    function_definition := pg_catalog.pg_get_functiondef(function_row.oid);

    if function_definition like
       '%public.checkout_phone_limit_applies_v1(p_customer_email)%' then
      continue;
    end if;

    patched_definition := pg_catalog.replace(
      function_definition,
      'if active_unpaid >= 2 then',
      'if active_unpaid >= 2 and public.checkout_phone_limit_applies_v1(p_customer_email) then'
    );
    patched_definition := pg_catalog.replace(
      patched_definition,
      'if active_unpaid>=2 then',
      'if active_unpaid>=2 and public.checkout_phone_limit_applies_v1(p_customer_email) then'
    );

    if patched_definition = function_definition then
      raise exception 'Restriction target tidak ditemukan pada %', function_row.proname;
    end if;

    execute patched_definition;
  end loop;

  foreach required_function in array array[
    'create_public_checkout_order',
    'create_public_custom_checkout_order',
    'create_public_configured_checkout_order'
  ]
  loop
    if not exists (
      select 1
      from pg_catalog.pg_proc proc
      join pg_catalog.pg_namespace ns
        on ns.oid = proc.pronamespace
      where ns.nspname = 'public'
        and proc.proname = required_function
        and pg_catalog.pg_get_functiondef(proc.oid) like
            '%Maksimal dua pesanan belum dibayar per nomor WhatsApp%'
        and pg_catalog.pg_get_functiondef(proc.oid) like
            '%public.checkout_phone_limit_applies_v1(p_customer_email)%'
    ) then
      raise exception 'Restriction patch tidak terpasang pada %', required_function;
    end if;
  end loop;
end;
$registered_customer_limit_patch$;

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

create or replace function public.create_public_custom_checkout_order(
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
  p_custom_projects jsonb,
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

  return public.create_public_custom_checkout_order(
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
    p_custom_projects,
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

create or replace function public.create_public_configured_checkout_order(
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
  p_configured_items jsonb,
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

  return public.create_public_configured_checkout_order(
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
    p_shipping_address_snapshot,
    p_configured_items
  );
end;
$$;

revoke all on function public.create_public_checkout_order(
  text,text,text,text,text,text,text,text,uuid,text,text,jsonb,jsonb,uuid
) from public, anon, authenticated;
revoke all on function public.create_public_custom_checkout_order(
  text,text,text,text,text,text,text,text,uuid,text,text,jsonb,jsonb,jsonb,uuid
) from public, anon, authenticated;
revoke all on function public.create_public_instant_checkout_order(
  text,text,text,text,text,text,text,text,uuid,text,text,jsonb,jsonb,uuid
) from public, anon, authenticated;
revoke all on function public.create_public_configured_checkout_order(
  text,text,text,text,text,text,text,text,uuid,text,text,jsonb,jsonb,jsonb,uuid
) from public, anon, authenticated;

grant execute on function public.create_public_checkout_order(
  text,text,text,text,text,text,text,text,uuid,text,text,jsonb,jsonb,uuid
) to service_role;
grant execute on function public.create_public_custom_checkout_order(
  text,text,text,text,text,text,text,text,uuid,text,text,jsonb,jsonb,jsonb,uuid
) to service_role;
grant execute on function public.create_public_instant_checkout_order(
  text,text,text,text,text,text,text,text,uuid,text,text,jsonb,jsonb,uuid
) to service_role;
grant execute on function public.create_public_configured_checkout_order(
  text,text,text,text,text,text,text,text,uuid,text,text,jsonb,jsonb,jsonb,uuid
) to service_role;

commit;
