alter table public.product_price_tiers
  drop constraint if exists product_price_tiers_no_overlap_active;

alter table public.product_price_tiers
  add constraint product_price_tiers_no_overlap_active
  exclude using gist (
    product_id with =,
    int4range(min_quantity, max_quantity, '[]') with &&
  )
  where (status = 'active');;
