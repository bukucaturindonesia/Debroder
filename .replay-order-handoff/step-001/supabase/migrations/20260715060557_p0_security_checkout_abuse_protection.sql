-- P0 Security Stage 4: checkout abuse protection.
-- Keeps checkout pricing/order/reservation semantics unchanged.

create schema if not exists private;

create table if not exists private.checkout_request_ledger (
  id bigint generated always as identity primary key,
  idempotency_key_hash text not null unique,
  payload_hash text not null,
  fingerprint_hash text not null,
  phone_hash text not null,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  retry_count integer not null default 0,
  constraint checkout_request_ledger_idempotency_hash_check check (idempotency_key_hash ~ '^[0-9a-f]{64}$'),
  constraint checkout_request_ledger_payload_hash_check check (payload_hash ~ '^[0-9a-f]{64}$'),
  constraint checkout_request_ledger_fingerprint_hash_check check (fingerprint_hash ~ '^[0-9a-f]{64}$'),
  constraint checkout_request_ledger_phone_hash_check check (phone_hash ~ '^[0-9a-f]{64}$'),
  constraint checkout_request_ledger_retry_count_check check (retry_count >= 0)
);

create index if not exists checkout_request_ledger_fingerprint_seen_idx
  on private.checkout_request_ledger(fingerprint_hash, first_seen_at desc);
create index if not exists checkout_request_ledger_phone_seen_idx
  on private.checkout_request_ledger(phone_hash, first_seen_at desc);

alter table private.checkout_request_ledger enable row level security;
revoke all on table private.checkout_request_ledger from public, anon, authenticated, service_role;
revoke all on sequence private.checkout_request_ledger_id_seq from public, anon, authenticated, service_role;

create or replace function public.enforce_public_checkout_abuse_guard(
  p_idempotency_key_hash text,
  p_payload_hash text,
  p_fingerprint_hash text,
  p_phone_hash text,
  p_request_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_request private.checkout_request_ledger;
  fingerprint_ten_minute_count integer := 0;
  fingerprint_daily_count integer := 0;
  phone_thirty_minute_count integer := 0;
  block_code text;
  retry_after_seconds integer := 0;
begin
  if p_idempotency_key_hash !~ '^[0-9a-f]{64}$'
     or p_payload_hash !~ '^[0-9a-f]{64}$'
     or p_fingerprint_hash !~ '^[0-9a-f]{64}$'
     or p_phone_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'Checkout security hash is invalid';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_idempotency_key_hash, 0));

  select * into existing_request
  from private.checkout_request_ledger
  where idempotency_key_hash = p_idempotency_key_hash
  for update;

  if found then
    if existing_request.payload_hash <> p_payload_hash then
      block_code := 'idempotency_payload_conflict';
      retry_after_seconds := 0;
    else
      update private.checkout_request_ledger
      set last_seen_at = now(), retry_count = retry_count + 1
      where id = existing_request.id;
      return jsonb_build_object(
        'allowed', true,
        'idempotent_retry', true,
        'retry_after_seconds', 0
      );
    end if;
  else
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_fingerprint_hash, 0));
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_phone_hash, 0));

    select count(*)::integer into fingerprint_ten_minute_count
    from private.checkout_request_ledger
    where fingerprint_hash = p_fingerprint_hash
      and first_seen_at > now() - interval '10 minutes';

    select count(*)::integer into fingerprint_daily_count
    from private.checkout_request_ledger
    where fingerprint_hash = p_fingerprint_hash
      and first_seen_at > now() - interval '24 hours';

    select count(*)::integer into phone_thirty_minute_count
    from private.checkout_request_ledger
    where phone_hash = p_phone_hash
      and first_seen_at > now() - interval '30 minutes';

    if fingerprint_ten_minute_count >= 5 then
      block_code := 'fingerprint_burst';
      retry_after_seconds := 600;
    elsif fingerprint_daily_count >= 20 then
      block_code := 'fingerprint_daily';
      retry_after_seconds := 86400;
    elsif phone_thirty_minute_count >= 3 then
      block_code := 'phone_burst';
      retry_after_seconds := 1800;
    else
      insert into private.checkout_request_ledger(
        idempotency_key_hash, payload_hash, fingerprint_hash, phone_hash
      ) values (
        p_idempotency_key_hash, p_payload_hash, p_fingerprint_hash, p_phone_hash
      );
      return jsonb_build_object(
        'allowed', true,
        'idempotent_retry', false,
        'retry_after_seconds', 0
      );
    end if;
  end if;

  if not exists (
    select 1
    from public.system_audit_log audit
    where audit.action = 'checkout_abuse_blocked'
      and audit.source = 'p0_security_stage_4'
      and audit.created_at > now() - interval '5 minutes'
      and audit.metadata->>'rule' = block_code
      and audit.metadata->>'fingerprint_hash' = p_fingerprint_hash
  ) then
    insert into public.system_audit_log(
      entity_type, action, actor_role, source, reason, request_id, metadata
    ) values (
      'checkout_security', 'checkout_abuse_blocked', 'system', 'p0_security_stage_4',
      block_code, nullif(btrim(coalesce(p_request_id, '')), ''),
      jsonb_build_object(
        'rule', block_code,
        'idempotency_key_hash', p_idempotency_key_hash,
        'fingerprint_hash', p_fingerprint_hash,
        'phone_hash', p_phone_hash,
        'fingerprint_10m_count', fingerprint_ten_minute_count,
        'fingerprint_24h_count', fingerprint_daily_count,
        'phone_30m_count', phone_thirty_minute_count
      )
    );
  end if;

  return jsonb_build_object(
    'allowed', false,
    'idempotent_retry', false,
    'code', block_code,
    'retry_after_seconds', retry_after_seconds
  );
end;
$$;

revoke all on function public.enforce_public_checkout_abuse_guard(text,text,text,text,text)
  from public, anon, authenticated;
grant execute on function public.enforce_public_checkout_abuse_guard(text,text,text,text,text)
  to service_role;

-- The application Route Handler is the only supported public checkout entry point.
revoke all on function public.create_public_checkout_order(
  text,text,text,text,text,text,text,text,uuid,text,text,jsonb
) from public, anon, authenticated;
grant execute on function public.create_public_checkout_order(
  text,text,text,text,text,text,text,text,uuid,text,text,jsonb
) to service_role;
