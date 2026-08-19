-- DEBRODER Custom Checkout structured-address snapshot refinement.
-- Apply after 20260718180000_custom_order_end_to_end_revision.sql.
-- Existing snapshot rows are shipping-only by contract and receive the same
-- immutable fulfillment marker through the non-null default.

begin;

alter table public.order_address_snapshots
  add column if not exists fulfillment_method text not null default 'shipping'
  check (fulfillment_method = 'shipping');

comment on column public.order_address_snapshots.fulfillment_method is
  'Immutable fulfillment method captured with the structured Custom shipping address.';

commit;

-- OWNER PREVIEW VERIFICATION (read-only):
-- select fulfillment_method,count(*) from public.order_address_snapshots group by fulfillment_method;
