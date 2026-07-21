-- DEBRODER Migration C1 emergency rollback
-- WARNING: This restores the insecure legacy ACL/policy state.
-- Use only after explicit owner approval when a critical operational dependency
-- is proven and safer containment is not immediately possible.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '30s';

do $preflight$
declare
  pgcrypto_schema text;
  create_order_oid regprocedure;
  submit_proof_oid regprocedure;
  create_order_hash text;
  submit_proof_hash text;
  policy_count integer;
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

  create_order_oid := pg_catalog.to_regprocedure(
    'public.create_public_order(text,text,text,uuid,text,text,text,integer,text,text,text,text)'
  );
  submit_proof_oid := pg_catalog.to_regprocedure(
    'public.submit_public_payment_proof(uuid,text,text,text)'
  );

  if create_order_oid is null or submit_proof_oid is null then
    raise exception 'Expected legacy RPC signature is missing';
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
     or submit_proof_hash <>
    'aecdbdcf357d7fbf8e835e404a13045f231eccdb4faf00059f6aa2a63ba2c1ca'
  then
    raise exception 'Legacy function body changed; rollback refused';
  end if;

  select count(*)
  into policy_count
  from pg_catalog.pg_policies
  where schemaname = 'storage'
    and tablename = 'objects'
    and policyname = 'Customers can upload order files';

  if policy_count <> 0 then
    raise exception 'Anonymous upload policy already exists; rollback refused';
  end if;

  select b.public
  into bucket_is_public
  from storage.buckets b
  where b.id = 'order-uploads';

  if not found or bucket_is_public then
    raise exception 'order-uploads bucket state is unexpected';
  end if;
end
$preflight$;

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
to anon, authenticated, service_role;

grant execute
on function public.submit_public_payment_proof(
  uuid,
  text,
  text,
  text
)
to anon, authenticated, service_role;

create policy "Customers can upload order files"
on storage.objects
for insert
to public
with check (
  bucket_id = 'order-uploads'
  and array_length(storage.foldername(name), 1) >= 1
);

commit;
