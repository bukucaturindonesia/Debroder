begin;

-- Requires 20261020163915_p0_regular_checkout_recovery_v1 first.
-- Only insert the shared transaction lock into the audited instant13 body.
-- Preserve environment-specific SQL formatting, wrappers, defaults and ACLs.
-- No order, ledger, price, stock, snapshot or audit-row backfill is performed.
do $instant_lock$
declare
  base_oid oid := 'public.create_public_checkout_order(text,text,text,text,text,text,text,text,uuid,text,text,jsonb)'::regprocedure;
  instant_oid oid := 'public.create_public_instant_checkout_order(text,text,text,text,text,text,text,text,uuid,text,text,jsonb,jsonb)'::regprocedure;
  rpc_oids oid[] := array[
    base_oid,
    'public.create_public_checkout_order(text,text,text,text,text,text,text,text,uuid,text,text,jsonb,jsonb)'::regprocedure::oid,
    'public.create_public_checkout_order(text,text,text,text,text,text,text,text,uuid,text,text,jsonb,jsonb,uuid)'::regprocedure::oid,
    instant_oid,
    'public.create_public_instant_checkout_order(text,text,text,text,text,text,text,text,uuid,text,text,jsonb,jsonb,uuid)'::regprocedure::oid
  ];
  lookup_marker constant text := '  select id into existing_order_id';
  lock_statement constant text := '  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(''ready-stock-checkout:'' || p_idempotency_key, 0));';
  base_source text;
  original_source text;
  original_definition text;
  patched_definition text;
  contracts_before jsonb;
  contracts_after jsonb;
begin
  -- Fail closed on incompatible security/contract state; never repair grants
  -- implicitly. All five overloads have zero defaults in the reviewed chain.
  if exists (
    select 1 from pg_catalog.pg_proc p
    where p.oid = any(rpc_oids) and (
      not p.prosecdef
      or not coalesce(p.proconfig @> array['search_path=""']::text[], false)
      or p.prorettype <> 'jsonb'::regtype
      or p.pronargdefaults <> 0
      or p.provolatile <> 'v'
      or p.prolang <> (select oid from pg_catalog.pg_language where lanname = 'plpgsql')
      or pg_catalog.has_function_privilege('anon', p.oid, 'EXECUTE')
      or pg_catalog.has_function_privilege('authenticated', p.oid, 'EXECUTE')
      or not pg_catalog.has_function_privilege('service_role', p.oid, 'EXECUTE')
      or exists (
        select 1 from pg_catalog.aclexplode(coalesce(p.proacl, pg_catalog.acldefault('f', p.proowner))) a
        where a.privilege_type = 'EXECUTE'
          and a.grantee <> p.proowner
          and a.grantee <> (select oid from pg_catalog.pg_roles where rolname = 'service_role')
      )
    )
  ) then
    raise exception 'P0 instant lock: checkout RPC security or argument contract differs; review required';
  end if;

  select prosrc into base_source from pg_catalog.pg_proc where oid = base_oid;
  if pg_catalog.strpos(base_source, lock_statement) = 0
     or pg_catalog.strpos(base_source, 'select * into existing_order from public.orders where public_idempotency_key = p_idempotency_key;')
        <= pg_catalog.strpos(base_source, lock_statement) then
    raise exception 'P0 instant lock: regular checkout recovery base12 lock must be applied first';
  end if;

  select prosrc, pg_catalog.pg_get_functiondef(oid)
  into original_source, original_definition
  from pg_catalog.pg_proc where oid = instant_oid;

  -- MD5 is a definition-drift check, not a security/payload hash. These are the
  -- previously reviewed production/staging prosrc bodies with CRLF normalized.
  if pg_catalog.md5(pg_catalog.replace(original_source, E'\r\n', E'\n')) not in (
    'abbcd07784b4fdb832ca891919cff60c',
    '20b08398c430687cc24f7d151f907397'
  ) then
    raise exception 'P0 instant lock: unreviewed instant13 body (or already patched); stop without changes';
  end if;
  if pg_catalog.length(original_definition)
       - pg_catalog.length(pg_catalog.replace(original_definition, lookup_marker, ''))
       <> pg_catalog.length(lookup_marker) then
    raise exception 'P0 instant lock: expected exactly one initial order lookup';
  end if;

  select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
    'contract', pg_catalog.to_jsonb(p) - 'prosrc',
    'other_body', case when p.oid = instant_oid then null else p.prosrc end
  ) order by p.oid) into contracts_before
  from pg_catalog.pg_proc p where p.oid = any(rpc_oids);

  -- Lock is held through commit/rollback, including nested base12 calls.
  -- The existing early RETURN now runs under this lock, before any repricing,
  -- reservation, service synchronization or pricing-audit insertion.
  patched_definition := pg_catalog.replace(
    original_definition, lookup_marker, lock_statement || E'\n' || lookup_marker
  );
  execute patched_definition;

  select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
    'contract', pg_catalog.to_jsonb(p) - 'prosrc',
    'other_body', case when p.oid = instant_oid then null else p.prosrc end
  ) order by p.oid) into contracts_after
  from pg_catalog.pg_proc p where p.oid = any(rpc_oids);

  if contracts_after is distinct from contracts_before
     or (select prosrc from pg_catalog.pg_proc where oid = instant_oid)
        is distinct from pg_catalog.replace(original_source, lookup_marker, lock_statement || E'\n' || lookup_marker) then
    raise exception 'P0 instant lock: unexpected RPC contract/body change; abort transaction';
  end if;
end;
$instant_lock$;

commit;
