-- DEBRODER Batch 2 / Migration C1
-- Critical Legacy Containment (forward-only)
--
-- Scope only:
--   1. If either exact legacy RPC exists, revoke PUBLIC/anon/authenticated
--      EXECUTE and preserve service_role EXECUTE temporarily.
--   2. If the historical order-uploads policy exists, remove it after
--      validating its exact anonymous INSERT semantics.
--   3. Treat intentionally absent legacy objects as a valid fresh-install
--      state; never recreate them merely to satisfy containment.
--
-- Explicitly out of scope:
--   - No function body replacement.
--   - No function/table/bucket deletion.
--   - No order/payment/audit/storage-object mutation.
--   - No broader SECURITY DEFINER ACL changes.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '30s';

-- Fail closed for legacy upgrade objects unless they still match the
-- reconciled historical identity and security state. Fresh CURRENT HEAD
-- installs intentionally omit these retired objects.
do $preflight$
declare
  pgcrypto_schema text;
  create_order_oid regprocedure;
  submit_proof_oid regprocedure;
  create_order_hash text;
  submit_proof_hash text;
  create_order_owner text;
  submit_proof_owner text;
  policy_count integer;
  matching_policy_count integer;
  bucket_is_public boolean;
begin
  select n.nspname
  into pgcrypto_schema
  from pg_catalog.pg_extension e
  join pg_catalog.pg_namespace n on n.oid = e.extnamespace
  where e.extname = 'pgcrypto';

  if pgcrypto_schema is null then
    raise exception 'pgcrypto extension is not installed';
  end if;

  if pg_catalog.to_regprocedure(
    pg_catalog.format('%I.digest(text,text)', pgcrypto_schema)
  ) is null then
    raise exception 'pgcrypto digest(text,text) is missing from schema %', pgcrypto_schema;
  end if;

  create_order_oid := pg_catalog.to_regprocedure(
    'public.create_public_order(text,text,text,uuid,text,text,text,integer,text,text,text,text)'
  );

  submit_proof_oid := pg_catalog.to_regprocedure(
    'public.submit_public_payment_proof(uuid,text,text,text)'
  );

  if create_order_oid is not null then
    select pg_catalog.pg_get_userbyid(p.proowner)
    into create_order_owner
    from pg_catalog.pg_proc p
    where p.oid = create_order_oid::oid;

    if create_order_owner is null
       or create_order_owner in ('anon', 'authenticated', 'public')
    then
      raise exception 'Unexpected create_public_order owner: %', create_order_owner;
    end if;

    execute pg_catalog.format(
      'select pg_catalog.encode(%I.digest(pg_catalog.pg_get_functiondef($1::oid), ''sha256''), ''hex'')',
      pgcrypto_schema
    )
    using create_order_oid::oid
    into create_order_hash;

    if create_order_hash <>
      '7a46727b98bd2cff278f7052c25711d175613f3aac6ee888615d5448641055f9'
    then
      raise exception 'create_public_order definition changed: %', create_order_hash;
    end if;

    -- The historical schema grants anon/authenticated and does not grant service_role.
    -- Accept that exact pair, or the already-contained final ACL. Any
    -- partial/unexpected state fails closed.
    if not (
      (
        pg_catalog.has_function_privilege('anon', create_order_oid, 'EXECUTE')
        and pg_catalog.has_function_privilege('authenticated', create_order_oid, 'EXECUTE')
      )
      or
      (
        not pg_catalog.has_function_privilege('anon', create_order_oid, 'EXECUTE')
        and not pg_catalog.has_function_privilege('authenticated', create_order_oid, 'EXECUTE')
        and pg_catalog.has_function_privilege('service_role', create_order_oid, 'EXECUTE')
      )
    ) then
      raise exception 'Unexpected create_public_order ACL state';
    end if;
  end if;

  if submit_proof_oid is not null then
    select pg_catalog.pg_get_userbyid(p.proowner)
    into submit_proof_owner
    from pg_catalog.pg_proc p
    where p.oid = submit_proof_oid::oid;

    if submit_proof_owner is null
       or submit_proof_owner in ('anon', 'authenticated', 'public')
    then
      raise exception 'Unexpected submit_public_payment_proof owner: %', submit_proof_owner;
    end if;

    execute pg_catalog.format(
      'select pg_catalog.encode(%I.digest(pg_catalog.pg_get_functiondef($1::oid), ''sha256''), ''hex'')',
      pgcrypto_schema
    )
    using submit_proof_oid::oid
    into submit_proof_hash;

    if submit_proof_hash <>
      'aecdbdcf357d7fbf8e835e404a13045f231eccdb4faf00059f6aa2a63ba2c1ca'
    then
      raise exception 'submit_public_payment_proof definition changed: %', submit_proof_hash;
    end if;

    -- The historical schema grants anon/authenticated and does not grant service_role.
    -- Accept that exact pair, or the already-contained final ACL. Any
    -- partial/unexpected state fails closed.
    if not (
      (
        pg_catalog.has_function_privilege('anon', submit_proof_oid, 'EXECUTE')
        and pg_catalog.has_function_privilege('authenticated', submit_proof_oid, 'EXECUTE')
      )
      or
      (
        not pg_catalog.has_function_privilege('anon', submit_proof_oid, 'EXECUTE')
        and not pg_catalog.has_function_privilege('authenticated', submit_proof_oid, 'EXECUTE')
        and pg_catalog.has_function_privilege('service_role', submit_proof_oid, 'EXECUTE')
      )
    ) then
      raise exception 'Unexpected submit_public_payment_proof ACL state';
    end if;
  end if;

  select count(*)
  into policy_count
  from pg_catalog.pg_policies
  where schemaname = 'storage'
    and tablename = 'objects'
    and policyname = 'Customers can upload order files';

  if policy_count > 0 then
    if policy_count <> 1 then
      raise exception 'Unexpected order-uploads policy count: %', policy_count;
    end if;

    select count(*)
    into matching_policy_count
    from pg_catalog.pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Customers can upload order files'
      and cmd = 'INSERT'
      and roles = array['public']::name[]
      and qual is null
      and pg_catalog.regexp_replace(
        with_check,
        '[[:space:]]+',
        '',
        'g'
      ) = '((bucket_id=''order-uploads''::text)AND(array_length(storage.foldername(name),1)>=1))';

    if matching_policy_count <> 1 then
      raise exception 'Unexpected order-uploads anonymous INSERT policy state';
    end if;
  end if;

  select b.public
  into bucket_is_public
  from storage.buckets b
  where b.id = 'order-uploads';

  if found and bucket_is_public then
    raise exception 'order-uploads bucket unexpectedly became public';
  end if;
end
$preflight$;

-- Apply containment only to objects that exist in a legacy upgrade. The
-- exact signatures are retained in these dynamic statements so a fresh
-- install never attempts to revoke a deliberately absent RPC.
do $containment$
declare
  create_order_oid regprocedure := pg_catalog.to_regprocedure(
    'public.create_public_order(text,text,text,uuid,text,text,text,integer,text,text,text,text)'
  );
  submit_proof_oid regprocedure := pg_catalog.to_regprocedure(
    'public.submit_public_payment_proof(uuid,text,text,text)'
  );
  legacy_policy_exists boolean;
begin
  if create_order_oid is not null then
    execute 'revoke all privileges on function public.create_public_order(text,text,text,uuid,text,text,text,integer,text,text,text,text) from public,anon,authenticated';
    execute 'grant execute on function public.create_public_order(text,text,text,uuid,text,text,text,integer,text,text,text,text) to service_role';
  end if;

  if submit_proof_oid is not null then
    execute 'revoke all privileges on function public.submit_public_payment_proof(uuid,text,text,text) from public,anon,authenticated';
    execute 'grant execute on function public.submit_public_payment_proof(uuid,text,text,text) to service_role';
  end if;

  select exists (
    select 1
    from pg_catalog.pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Customers can upload order files'
  )
  into legacy_policy_exists;

  if legacy_policy_exists then
    execute 'drop policy "Customers can upload order files" on storage.objects';
  end if;
end
$containment$;

-- Transaction-local postflight: verify only the intended ACL/policy changes.
do $postflight$
declare
  create_order_oid regprocedure := pg_catalog.to_regprocedure(
    'public.create_public_order(text,text,text,uuid,text,text,text,integer,text,text,text,text)'
  );
  submit_proof_oid regprocedure := pg_catalog.to_regprocedure(
    'public.submit_public_payment_proof(uuid,text,text,text)'
  );
  remaining_policy_count integer;
  bucket_is_public boolean;
begin
  if create_order_oid is not null then
    if pg_catalog.has_function_privilege('anon', create_order_oid, 'EXECUTE')
       or pg_catalog.has_function_privilege('authenticated', create_order_oid, 'EXECUTE')
       or not pg_catalog.has_function_privilege('service_role', create_order_oid, 'EXECUTE')
    then
      raise exception 'create_public_order ACL postflight failed';
    end if;
  end if;

  if submit_proof_oid is not null then
    if pg_catalog.has_function_privilege('anon', submit_proof_oid, 'EXECUTE')
       or pg_catalog.has_function_privilege('authenticated', submit_proof_oid, 'EXECUTE')
       or not pg_catalog.has_function_privilege('service_role', submit_proof_oid, 'EXECUTE')
    then
      raise exception 'submit_public_payment_proof ACL postflight failed';
    end if;
  end if;

  select count(*)
  into remaining_policy_count
  from pg_catalog.pg_policies
  where schemaname = 'storage'
    and tablename = 'objects'
    and policyname = 'Customers can upload order files';

  if remaining_policy_count <> 0 then
    raise exception 'Anonymous order-uploads INSERT policy still exists';
  end if;

  select b.public
  into bucket_is_public
  from storage.buckets b
  where b.id = 'order-uploads';

  if found and bucket_is_public then
    raise exception 'order-uploads bucket postflight failed';
  end if;
end
$postflight$;

commit;
