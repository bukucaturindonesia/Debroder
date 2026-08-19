begin;

-- P7B: align canonical public Ready Stock policy at the database boundary.
-- Additive only: no historical order, pricing snapshot, or inventory mutation.

create or replace function public.enforce_public_ready_stock_cart_limits_v1()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  order_source text;
  ready_line_count integer;
  ready_unit_count integer;
begin
  select o.checkout_source
  into order_source
  from public.orders o
  where o.id = new.order_id
  for update;

  if not found
     or order_source <> 'public_checkout'
     or new.custom_project_id is not null then
    return new;
  end if;

  if new.quantity < 1 or new.quantity > 100 then
    raise exception 'Quantity Ready Stock harus antara 1 dan 100';
  end if;

  select
    count(*)::integer + 1,
    coalesce(sum(oi.quantity), 0)::integer + new.quantity
  into ready_line_count, ready_unit_count
  from public.order_items oi
  where oi.order_id = new.order_id
    and oi.archived_at is null
    and oi.custom_project_id is null
    and oi.id <> new.id;

  if ready_line_count > 50 then
    raise exception 'Ready Stock maksimal 50 baris per checkout';
  end if;

  if ready_unit_count > 500 then
    raise exception 'Ready Stock maksimal 500 unit per checkout';
  end if;

  return new;
end;
$function$;

revoke all on function public.enforce_public_ready_stock_cart_limits_v1()
from public, anon, authenticated;
grant execute on function public.enforce_public_ready_stock_cart_limits_v1()
to service_role;

drop trigger if exists trg_enforce_public_ready_stock_cart_limits_v1
on public.order_items;

create trigger trg_enforce_public_ready_stock_cart_limits_v1
before insert or update of order_id, custom_project_id, quantity
on public.order_items
for each row execute function public.enforce_public_ready_stock_cart_limits_v1();

create or replace function public.enforce_public_ready_stock_policy_v1()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  order_row public.orders;
  has_ready boolean;
  has_custom boolean;
  ready_line_count integer;
  ready_unit_count integer;
  product_quantity record;
  minimum_quantity_value integer;
  quotation_quantity_value integer;
begin
  select *
  into order_row
  from public.orders o
  where o.id = new.order_id
  for update;

  if not found or order_row.checkout_source <> 'public_checkout' then
    return null;
  end if;

  select
    count(*) filter (
      where oi.archived_at is null
        and oi.custom_project_id is null
    )::integer,
    coalesce(sum(oi.quantity) filter (
      where oi.archived_at is null
        and oi.custom_project_id is null
    ), 0)::integer,
    bool_or(
      oi.archived_at is null
      and oi.custom_project_id is null
    ),
    bool_or(
      oi.archived_at is null
      and oi.custom_project_id is not null
    ) or jsonb_array_length(
      coalesce(order_row.custom_project_snapshot, '[]'::jsonb)
    ) > 0
  into ready_line_count, ready_unit_count, has_ready, has_custom
  from public.order_items oi
  where oi.order_id = new.order_id;

  has_ready := coalesce(has_ready, false);
  has_custom := coalesce(has_custom, false);

  if has_ready and has_custom then
    raise exception 'Satu checkout hanya boleh menggunakan satu mode pesanan';
  end if;

  if not has_ready then
    return null;
  end if;

  if ready_line_count > 50 then
    raise exception 'Ready Stock maksimal 50 baris per checkout';
  end if;

  if exists (
    select 1
    from public.order_items oi
    where oi.order_id = new.order_id
      and oi.archived_at is null
      and oi.custom_project_id is null
      and (oi.quantity < 1 or oi.quantity > 100)
  ) then
    raise exception 'Quantity Ready Stock harus antara 1 dan 100';
  end if;

  if ready_unit_count > 500 then
    raise exception 'Ready Stock maksimal 500 unit per checkout';
  end if;

  for product_quantity in
    select
      oi.product_id,
      sum(oi.quantity)::integer as quantity
    from public.order_items oi
    where oi.order_id = new.order_id
      and oi.archived_at is null
      and oi.custom_project_id is null
    group by oi.product_id
  loop
    minimum_quantity_value := null;
    quotation_quantity_value := null;

    select rule.minimum_quantity, rule.quotation_quantity
    into minimum_quantity_value, quotation_quantity_value
    from public.product_minimum_rules rule
    where rule.product_id = product_quantity.product_id
      and rule.status = 'active'
    limit 1;

    if minimum_quantity_value is not null
       and product_quantity.quantity < minimum_quantity_value then
      raise exception
        'Minimum Ready Stock untuk produk ini adalah % unit',
        minimum_quantity_value;
    end if;

    if quotation_quantity_value is not null
       and product_quantity.quantity >= quotation_quantity_value then
      raise exception
        'Jumlah Ready Stock % unit memerlukan quotation',
        product_quantity.quantity;
    end if;
  end loop;

  return null;
end;
$function$;

revoke all on function public.enforce_public_ready_stock_policy_v1()
from public, anon, authenticated;
grant execute on function public.enforce_public_ready_stock_policy_v1()
to service_role;

drop trigger if exists trg_enforce_public_ready_stock_policy_v1
on public.order_items;

create constraint trigger trg_enforce_public_ready_stock_policy_v1
after insert on public.order_items
deferrable initially deferred
for each row execute function public.enforce_public_ready_stock_policy_v1();

create or replace function public.prevent_public_ready_stock_pricing_snapshot_mutation_v1()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  order_source text;
begin
  if old.pricing_snapshot = '{}'::jsonb then
    return new;
  end if;

  select o.checkout_source
  into order_source
  from public.orders o
  where o.id = old.order_id;

  if order_source = 'public_checkout'
     and old.custom_project_id is null
     and (
       new.pricing_snapshot is distinct from old.pricing_snapshot
       or new.unit_price is distinct from old.unit_price
       or new.subtotal is distinct from old.subtotal
       or new.pricing_status is distinct from old.pricing_status
     ) then
    raise exception 'Historical Ready Stock pricing snapshot bersifat immutable';
  end if;

  return new;
end;
$function$;

revoke all on function public.prevent_public_ready_stock_pricing_snapshot_mutation_v1()
from public, anon, authenticated;
grant execute on function public.prevent_public_ready_stock_pricing_snapshot_mutation_v1()
to service_role;

drop trigger if exists trg_prevent_public_ready_stock_pricing_snapshot_mutation_v1
on public.order_items;

create trigger trg_prevent_public_ready_stock_pricing_snapshot_mutation_v1
before update of pricing_snapshot, unit_price, subtotal, pricing_status
on public.order_items
for each row execute function public.prevent_public_ready_stock_pricing_snapshot_mutation_v1();

insert into public.system_audit_log(
  entity_type,
  action,
  actor_role,
  source,
  reason,
  metadata
)
values (
  'checkout_policy',
  'p7b_policy_database_alignment_v1_applied',
  'system',
  'p7b',
  'Canonical Ready Stock limits, minimum/quotation policy, checkout mode, and pricing snapshot immutability aligned at the database boundary',
  jsonb_build_object(
    'max_lines', 50,
    'max_line_quantity', 100,
    'max_total_quantity', 500,
    'minimum_rules_enforced', true,
    'quotation_threshold_enforced', true,
    'single_checkout_mode_enforced', true,
    'historical_pricing_snapshot_immutable', true,
    'historical_rows_mutated', false,
    'inventory_authority_changed', false
  )
);

commit;
