alter table public.orders
  add column if not exists custom_pricing_draft jsonb,
  add column if not exists custom_pricing_draft_version integer not null default 0,
  add column if not exists custom_pricing_draft_updated_at timestamptz,
  add column if not exists custom_pricing_draft_updated_by uuid references auth.users(id) on delete set null;

alter table public.orders drop constraint if exists orders_custom_pricing_draft_version_check;
alter table public.orders add constraint orders_custom_pricing_draft_version_check
  check(custom_pricing_draft_version >= 0);
alter table public.orders drop constraint if exists orders_custom_pricing_draft_shape_check;
alter table public.orders add constraint orders_custom_pricing_draft_shape_check
  check(custom_pricing_draft is null or jsonb_typeof(custom_pricing_draft)='object');

alter table public.custom_order_quotation_versions
  add column if not exists finalization_key text;
create unique index if not exists custom_order_quotation_finalization_key_idx
  on public.custom_order_quotation_versions(order_id,finalization_key)
  where finalization_key is not null;;
