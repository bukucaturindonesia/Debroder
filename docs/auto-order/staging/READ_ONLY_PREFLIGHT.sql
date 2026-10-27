-- Review aid only: metadata SELECTs, no DDL/DML or application RPC execution.
-- Verify the authorized project through the connection before using this file.
-- This file was prepared locally, not executed as a remote migration.

with required(name) as (values
  ('orders'), ('order_payments'), ('order_tasks'), ('stock_reservations'),
  ('pickup_preparations'), ('fulfillments'), ('fast_checkout_settings'),
  ('fast_checkout_sessions'), ('fast_payment_attempts'), ('fast_checkout_rate_limits')
)
select name, to_regclass('public.' || name) is not null as present
from required order by name;

with required(name) as (values
  ('fast_checkout_preview_v1'), ('fast_checkout_create_v1'),
  ('fast_payment_claim_v1'), ('fast_payment_apply_v1'),
  ('fast_checkout_limit_v1'), ('fast_settings_update_v1'),
  ('fast_product_shipping_update_v1')
)
select r.name, count(p.oid) as overload_count
from required r
left join pg_namespace n on n.nspname = 'public'
left join pg_proc p on p.pronamespace = n.oid and p.proname = r.name
group by r.name order by r.name;

select version from supabase_migrations.schema_migrations
where version = '20261026045918';

select table_name, column_name, data_type
from information_schema.columns
where table_schema = 'public' and
  ((table_name = 'products' and column_name in
    ('shipping_weight_grams', 'shipping_length_cm', 'shipping_width_cm', 'shipping_height_cm'))
   or (table_name = 'order_payments' and column_name = 'provider_attempt_id'))
order by table_name, column_name;

select c.relname as table_name, c.relrowsecurity as rls_enabled
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind in ('r', 'p')
  and c.relname in ('orders', 'order_payments', 'order_tasks',
    'stock_reservations', 'pickup_preparations', 'fulfillments')
order by c.relname;

-- Enabled flags and signatures are not row-level authorization/runtime proof.
