-- Guest order tracking extends the existing public order access token.
-- Rollback (only before customer links depend on expiry): drop the trigger,
-- trigger function, indexes, constraint, and public_access_token_expires_at column.

alter table public.orders
  add column if not exists public_access_token_expires_at timestamptz;

comment on column public.orders.public_access_token_expires_at is
  'Expiry for the hashed guest order tracking/public confirmation token.';

update public.orders
set public_access_token_expires_at = now() + interval '90 days'
where public_access_token_hash is not null
  and public_access_token_expires_at is null;

alter table public.orders
  drop constraint if exists orders_public_access_token_expiry_check;

alter table public.orders
  add constraint orders_public_access_token_expiry_check
  check (public_access_token_hash is null or public_access_token_expires_at is not null);

create index if not exists orders_public_access_token_expiry_idx
  on public.orders(public_access_token_expires_at)
  where public_access_token_hash is not null and archived_at is null;

create index if not exists system_audit_log_guest_tracking_fingerprint_idx
  on public.system_audit_log((metadata ->> 'fingerprint'), created_at desc)
  where source = 'guest_order_tracking' and action = 'guest_tracking_denied';

create or replace function public.set_order_public_access_token_expiry()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.public_access_token_hash is null then
    new.public_access_token_expires_at := null;
  elsif tg_op = 'INSERT'
    or old.public_access_token_hash is distinct from new.public_access_token_hash
    or new.public_access_token_expires_at is null then
    new.public_access_token_expires_at := now() + interval '90 days';
  end if;
  return new;
end;
$$;

drop trigger if exists orders_public_access_token_expiry on public.orders;
create trigger orders_public_access_token_expiry
before insert or update of public_access_token_hash on public.orders
for each row execute function public.set_order_public_access_token_expiry();

revoke all on function public.set_order_public_access_token_expiry() from public, anon, authenticated;
grant execute on function public.set_order_public_access_token_expiry() to service_role;
