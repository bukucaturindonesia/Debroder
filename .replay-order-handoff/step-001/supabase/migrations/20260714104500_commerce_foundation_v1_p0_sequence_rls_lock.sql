begin;

-- These allocator/compatibility tables are implementation details. Checkout
-- and payment numbering use security-definer RPCs, never direct client access.
alter table if exists public.order_number_sequences enable row level security;
alter table if exists public.payment_number_sequences enable row level security;
alter table if exists public.debroder_schema_versions enable row level security;

revoke all on public.payment_number_sequences from anon, authenticated;
revoke all on public.debroder_schema_versions from anon, authenticated;

grant all on public.payment_number_sequences to service_role;
grant all on public.debroder_schema_versions to service_role;

-- order_number_sequences belonged to the retired order-conversion allocator.
-- CURRENT HEAD uses document_number_sequences instead.  Preserve the legacy
-- ACL lock for upgrade databases without making fresh replay recreate or
-- require the obsolete table.
do $$
begin
  if to_regclass('public.order_number_sequences') is not null then
    execute 'revoke all on public.order_number_sequences from anon, authenticated';
    execute 'grant all on public.order_number_sequences to service_role';
  end if;
end
$$;

commit;

-- Recovery: restore only the prior grants required by a known legacy client.
-- Do not disable RLS merely to restore client access.
