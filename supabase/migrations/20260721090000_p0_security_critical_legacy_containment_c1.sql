-- DEBRODER Batch 2 / Migration C1
-- Critical Legacy Containment (forward-only)
--
-- Scope only:
--   1. Revoke PUBLIC/anon/authenticated EXECUTE from the two exact legacy RPCs.
--   2. Preserve service_role EXECUTE temporarily.
--   3. Remove the anonymous INSERT policy on storage.objects for order-uploads.
--
-- Explicitly out of scope:
--   - No function body replacement.
--   - No function/table/bucket deletion.
--   - No order/payment/audit/storage-object mutation.
--   - No broader SECURITY DEFINER ACL changes.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '30s';

-- Fail closed unless the remote objects still match the reconciled baseline.
do $preflight$
declare
  pgcrypto_schema text;
  create_order_oid regprocedure;
  submit_proof_oid regprocedure;
  create_order_hash text;
  submit_proof_hash text;
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

  if create_order_oid is null then
    raise exception 'Expected create_public_order signature is missing';
  end if;

  if submit_proof_oid is null then
    raise exception 'Expected submit_public_payment_proof signature is missing';
  end if;

  execute pg_catalog.format(
    'select pg_catalog.encode(%I.digest(pg_catalog.pg_get_functiondef($1::oid), ''sha256''), ''hex'')',
    pgcrypto_schema
  )
  using create_order_oid::oid
  into create_order_hash;

  execute pg_catalog.format(
    'select pg_catalog.encode(%I.digest(pg_catalog.pg_get_functiondef($1::oid), ''sha256''), ''hex'')',
    pgcrypto_schema
  )
  using submit_proof_oid::oid
  into submit_proof_hash;

  if create_order_hash <>
    '7a46727b98bd2cff278f7052c25711d175613f3aac6ee888615d5448641055f9'
  then
    raise exception 'create_public_order definition changed: %', create_order_hash;
  end if;

  if submit_proof_hash <>
    'aecdbdcf357d7fbf8e835e404a13045f231eccdb4faf00059f6aa2a63ba2c1ca'
  then
    raise exception 'submit_public_payment_proof definition changed: %', submit_proof_hash;
  end if;

  if not pg_catalog.has_function_privilege('anon', create_order_oid, 'EXECUTE')
     or not pg_catalog.has_function_privilege('authenticated', create_order_oid, 'EXECUTE')
     or not pg_catalog.has_function_privilege('service_role', create_order_oid, 'EXECUTE')
  then
    raise exception 'Unexpected create_public_order ACL state';
  end if;

  if not pg_catalog.has_function_privilege('anon', submit_proof_oid, 'EXECUTE')
     or not pg_catalog.has_function_privilege('authenticated', submit_proof_oid, 'EXECUTE')
     or not pg_catalog.has_function_privilege('service_role', submit_proof_oid, 'EXECUTE')
  then
    raise exception 'Unexpected submit_public_payment_proof ACL state';
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

  select b.public
  into bucket_is_public
  from storage.buckets b
  where b.id = 'order-uploads';

  if not found then
    raise exception 'order-uploads bucket is missing';
  end if;

  if bucket_is_public then
    raise exception 'order-uploads bucket unexpectedly became public';
  end if;
end
$preflight$;

revoke all privileges
on function public.create_public_order(
  text,
  text,
  text,
  uuid,
  text,
  text,
  text,
  integer,
  text,
  text,
  text,
  text
)
from public, anon, authenticated;

grant execute
on function public.create_public_order(
  text,
  text,
  text,
  uuid,
  text,
  text,
  text,
  integer,
  text,
  text,
  text,
  text
)
to service_role;

revoke all privileges
on function public.submit_public_payment_proof(
  uuid,
  text,
  text,
  text
)
from public, anon, authenticated;

grant execute
on function public.submit_public_payment_proof(
  uuid,
  text,
  text,
  text
)
to service_role;

drop policy "Customers can upload order files"
on storage.objects;

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
  if pg_catalog.has_function_privilege('anon', create_order_oid, 'EXECUTE')
     or pg_catalog.has_function_privilege('authenticated', create_order_oid, 'EXECUTE')
     or not pg_catalog.has_function_privilege('service_role', create_order_oid, 'EXECUTE')
  then
    raise exception 'create_public_order ACL postflight failed';
  end if;

  if pg_catalog.has_function_privilege('anon', submit_proof_oid, 'EXECUTE')
     or pg_catalog.has_function_privilege('authenticated', submit_proof_oid, 'EXECUTE')
     or not pg_catalog.has_function_privilege('service_role', submit_proof_oid, 'EXECUTE')
  then
    raise exception 'submit_public_payment_proof ACL postflight failed';
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

  if not found or bucket_is_public then
    raise exception 'order-uploads bucket postflight failed';
  end if;
end
$postflight$;

commit;
