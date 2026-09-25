begin;

create or replace function public.normalize_product_commerce_defaults_v1()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if new.pricing_mode in ('configurator_based','custom_quote') or new.uses_configurator then
    if new.sales_mode <> 'both' then new.sales_mode := 'custom'; end if;
    new.tier_scope := 'none';
  elsif new.sales_mode is null or new.sales_mode = '' then
    new.sales_mode := 'ready_stock';
  end if;

  if new.tier_scope is null or new.tier_scope = '' then
    new.tier_scope := 'none';
  end if;

  return new;
end;
$function$;

revoke all on function public.normalize_product_commerce_defaults_v1()
from public, anon, authenticated;
grant execute on function public.normalize_product_commerce_defaults_v1()
to service_role;

drop trigger if exists trg_normalize_product_commerce_defaults_v1
on public.products;

create trigger trg_normalize_product_commerce_defaults_v1
before insert or update of pricing_mode, uses_configurator, sales_mode, tier_scope
on public.products
for each row execute function public.normalize_product_commerce_defaults_v1();

create or replace function public.sync_product_tier_scope_v1()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  affected_product_id uuid;
begin
  affected_product_id := coalesce(new.product_id, old.product_id);

  if affected_product_id is not null then
    update public.products p
    set tier_scope = case
      when p.pricing_mode in ('configurator_based','custom_quote') or p.uses_configurator
        then 'none'
      when exists (
        select 1 from public.product_price_tiers ppt
        where ppt.product_id = affected_product_id
          and ppt.status = 'active'
      ) then 'product'
      else 'none'
    end,
    updated_at = now()
    where p.id = affected_product_id;
  end if;

  if tg_op = 'UPDATE' and old.product_id is distinct from new.product_id then
    update public.products p
    set tier_scope = case
      when p.pricing_mode in ('configurator_based','custom_quote') or p.uses_configurator
        then 'none'
      when exists (
        select 1 from public.product_price_tiers ppt
        where ppt.product_id = old.product_id
          and ppt.status = 'active'
      ) then 'product'
      else 'none'
    end,
    updated_at = now()
    where p.id = old.product_id;
  end if;

  return coalesce(new, old);
end;
$function$;

revoke all on function public.sync_product_tier_scope_v1()
from public, anon, authenticated;
grant execute on function public.sync_product_tier_scope_v1()
to service_role;

drop trigger if exists trg_sync_product_tier_scope_v1
on public.product_price_tiers;

create trigger trg_sync_product_tier_scope_v1
after insert or update of product_id, status or delete
on public.product_price_tiers
for each row execute function public.sync_product_tier_scope_v1();

insert into public.system_audit_log(
  entity_type, action, actor_role, source, reason, metadata
) values (
  'commerce_foundation',
  'product_commerce_defaults_sync_v1_applied',
  'system',
  'batch_4',
  'Automatic future-product commerce defaults and tier scope synchronization',
  jsonb_build_object(
    'custom_mode_auto_mapping', true,
    'tier_scope_auto_sync', true,
    'delete_performed', false
  )
);

commit;
