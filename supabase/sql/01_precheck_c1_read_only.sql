-- DEBRODER Migration C1 pre-check
-- READ-ONLY. This script does not change database state.

begin;
set transaction read only;
set local statement_timeout = '30s';

select
  current_database() as database_name,
  current_user as database_user,
  now() as checked_at;

select
  n.nspname as pgcrypto_schema,
  pg_catalog.to_regprocedure(
    pg_catalog.format('%I.digest(text,text)', n.nspname)
  ) as digest_text_signature
from pg_catalog.pg_extension e
join pg_catalog.pg_namespace n on n.oid = e.extnamespace
where e.extname = 'pgcrypto';

-- Fail closed and report SHA-256 through NOTICE using the actual pgcrypto schema.
do $hash_check$
declare
  pgcrypto_schema text;
  create_order_oid regprocedure;
  submit_proof_oid regprocedure;
  create_order_hash text;
  submit_proof_hash text;
begin
  select n.nspname
  into pgcrypto_schema
  from pg_catalog.pg_extension e
  join pg_catalog.pg_namespace n on n.oid = e.extnamespace
  where e.extname = 'pgcrypto';

  if pgcrypto_schema is null then
    raise exception 'STOP: pgcrypto extension is not installed';
  end if;

  if pg_catalog.to_regprocedure(
    pg_catalog.format('%I.digest(text,text)', pgcrypto_schema)
  ) is null then
    raise exception 'STOP: digest(text,text) is missing from schema %', pgcrypto_schema;
  end if;

  create_order_oid := pg_catalog.to_regprocedure(
    'public.create_public_order(text,text,text,uuid,text,text,text,integer,text,text,text,text)'
  );
  submit_proof_oid := pg_catalog.to_regprocedure(
    'public.submit_public_payment_proof(uuid,text,text,text)'
  );

  if create_order_oid is null or submit_proof_oid is null then
    raise exception 'STOP: one or both exact legacy RPC signatures are missing';
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

  raise notice 'pgcrypto schema: %', pgcrypto_schema;
  raise notice 'create_public_order SHA-256: %', create_order_hash;
  raise notice 'submit_public_payment_proof SHA-256: %', submit_proof_hash;

  if create_order_hash <>
    '7a46727b98bd2cff278f7052c25711d175613f3aac6ee888615d5448641055f9'
  then
    raise exception 'STOP: create_public_order definition hash changed';
  end if;

  if submit_proof_hash <>
    'aecdbdcf357d7fbf8e835e404a13045f231eccdb4faf00059f6aa2a63ba2c1ca'
  then
    raise exception 'STOP: submit_public_payment_proof definition hash changed';
  end if;
end
$hash_check$;

select
  count(*) as migration_count,
  max(version) as latest_version
from supabase_migrations.schema_migrations;

select
  p.proname,
  pg_catalog.pg_get_function_identity_arguments(p.oid) as identity_arguments,
  pg_catalog.pg_get_function_result(p.oid) as result_type,
  r.rolname as owner,
  p.prosecdef as security_definer,
  p.proconfig as function_config,
  pg_catalog.has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute,
  pg_catalog.has_function_privilege('authenticated', p.oid, 'EXECUTE')
    as authenticated_execute,
  pg_catalog.has_function_privilege('service_role', p.oid, 'EXECUTE')
    as service_role_execute
from pg_catalog.pg_proc p
join pg_catalog.pg_namespace n on n.oid = p.pronamespace
join pg_catalog.pg_roles r on r.oid = p.proowner
where n.nspname = 'public'
  and p.oid in (
    pg_catalog.to_regprocedure(
      'public.create_public_order(text,text,text,uuid,text,text,text,integer,text,text,text,text)'
    )::oid,
    pg_catalog.to_regprocedure(
      'public.submit_public_payment_proof(uuid,text,text,text)'
    )::oid
  )
order by p.proname;

select
  policyname,
  cmd,
  roles,
  qual,
  with_check
from pg_catalog.pg_policies
where schemaname = 'storage'
  and tablename = 'objects'
  and policyname in (
    'Customers can upload order files',
    'Superadmin can view order files',
    'Superadmin can delete order files'
  )
order by policyname;

select
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
from storage.buckets
where id = 'order-uploads';

select
  (select count(*) from public.orders) as orders,
  (select count(*) from public.order_payments) as order_payments,
  (
    select count(*)
    from storage.objects
    where bucket_id = 'order-uploads'
  ) as order_upload_objects,
  (select count(*) from public.system_audit_log) as audit_rows;

-- Metadata-only storage manifest. File bytes are not read.
select
  id,
  bucket_id,
  name,
  owner_id,
  created_at,
  updated_at,
  metadata
from storage.objects
where bucket_id = 'order-uploads'
order by created_at, id;

rollback;
