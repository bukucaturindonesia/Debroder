begin;

insert into public.product_categories (
  id, name, slug, description, status, is_active, sort_order
) values (
  '66666666-6666-4666-8666-666666666666',
  'DEBRODER E2E Ready Stock',
  'debroder-e2e-ready-stock',
  'Namespace-scoped Wave 0 ready-stock fixture.',
  'active',
  true,
  1
)
on conflict (id) do update set
  name = excluded.name,
  slug = excluded.slug,
  description = excluded.description,
  status = excluded.status,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order,
  updated_at = now();

insert into public.products (
  id, name, slug, product_category_id, base_price, description, status,
  product_type, pricing_mode, has_variants, uses_configurator,
  minimum_order_qty, required_services, config_schema, admin_notes,
  public_description, sku, short_detail, badge, image_alt,
  collection_tags, intent_tags, color_tags, size_tags, material_tags,
  sales_mode, tier_scope
) values (
  '77777777-7777-4777-8777-777777777777',
  'DEBRODER E2E Ready Stock',
  'debroder-e2e-ready-stock',
  '66666666-6666-4666-8666-666666666666',
  125000,
  'Namespace-scoped Wave 0 ready-stock product.',
  'active',
  'standard_product',
  'fixed_price',
  true,
  false,
  2,
  '{}'::text[],
  '{}'::jsonb,
  'debroder_e2e_wave0b',
  'Ready Stock fixture for authenticated Wave 0 verification.',
  'DEBRODER-E2E-RS',
  'Ready Stock',
  'E2E',
  'DEBRODER E2E Ready Stock',
  array['debroder_e2e_wave0b'],
  array['ready_stock'],
  array['black'],
  array['M'],
  array['cotton'],
  'ready_stock',
  'none'
)
on conflict (id) do update set
  name = excluded.name,
  slug = excluded.slug,
  product_category_id = excluded.product_category_id,
  base_price = excluded.base_price,
  description = excluded.description,
  status = excluded.status,
  product_type = excluded.product_type,
  pricing_mode = excluded.pricing_mode,
  has_variants = excluded.has_variants,
  uses_configurator = excluded.uses_configurator,
  minimum_order_qty = excluded.minimum_order_qty,
  required_services = excluded.required_services,
  config_schema = excluded.config_schema,
  admin_notes = excluded.admin_notes,
  public_description = excluded.public_description,
  sku = excluded.sku,
  short_detail = excluded.short_detail,
  badge = excluded.badge,
  image_alt = excluded.image_alt,
  collection_tags = excluded.collection_tags,
  intent_tags = excluded.intent_tags,
  color_tags = excluded.color_tags,
  size_tags = excluded.size_tags,
  material_tags = excluded.material_tags,
  sales_mode = excluded.sales_mode,
  tier_scope = excluded.tier_scope,
  updated_at = now();

insert into public.product_sizes (
  id, name, slug, sort_order, status, price_adjustment
) values (
  '99999999-9999-4999-8999-999999999999',
  'M',
  'm',
  1,
  'active',
  0
)
on conflict (id) do update set
  name = excluded.name,
  slug = excluded.slug,
  sort_order = excluded.sort_order,
  status = excluded.status,
  price_adjustment = excluded.price_adjustment,
  updated_at = now();

insert into public.product_size_master (
  id, name, slug, size_group, is_active, sort_order, product_size_id
) values (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'M',
  'm',
  'apparel',
  true,
  1,
  '99999999-9999-4999-8999-999999999999'
)
on conflict (id) do update set
  name = excluded.name,
  slug = excluded.slug,
  size_group = excluded.size_group,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order,
  product_size_id = excluded.product_size_id,
  updated_at = now();

insert into public.product_variants (
  id, product_id, name, slug, hex_code, sku, sort_order, is_default,
  status, price_adjustment, variant_name, color_name, color_hex, is_active
) values (
  '88888888-8888-4888-8888-888888888888',
  '77777777-7777-4777-8777-777777777777',
  'E2E Ready Stock',
  'e2e-ready-stock',
  '#111111',
  'DEBRODER-E2E-RS-BLK',
  1,
  true,
  'active',
  0,
  'E2E Ready Stock',
  'Black',
  '#111111',
  true
)
on conflict (id) do update set
  product_id = excluded.product_id,
  name = excluded.name,
  slug = excluded.slug,
  hex_code = excluded.hex_code,
  sku = excluded.sku,
  sort_order = excluded.sort_order,
  is_default = excluded.is_default,
  status = excluded.status,
  price_adjustment = excluded.price_adjustment,
  variant_name = excluded.variant_name,
  color_name = excluded.color_name,
  color_hex = excluded.color_hex,
  is_active = excluded.is_active,
  updated_at = now();

insert into public.product_variant_sizes (
  id, variant_id, size_id, sku, stock_quantity, price_adjustment,
  status, size_name, stock, is_active, sort_order
) values (
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  '88888888-8888-4888-8888-888888888888',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'DEBRODER-E2E-RS-BLK-M',
  20,
  0,
  'active',
  'M',
  20,
  true,
  1
)
on conflict (id) do update set
  variant_id = excluded.variant_id,
  size_id = excluded.size_id,
  sku = excluded.sku,
  stock_quantity = excluded.stock_quantity,
  price_adjustment = excluded.price_adjustment,
  status = excluded.status,
  size_name = excluded.size_name,
  stock = excluded.stock,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order,
  updated_at = now();

insert into public.inventory_balances (
  location_id, variant_size_id, on_hand_quantity, reserved_quantity,
  updated_by
) values (
  '44444444-4444-4444-8444-444444444444',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  20,
  0,
    '42512f1c-e0d3-46bf-8289-158cb72c9222'
)
on conflict (location_id, variant_size_id) do update set
  on_hand_quantity = excluded.on_hand_quantity,
  reserved_quantity = excluded.reserved_quantity,
  updated_by = excluded.updated_by,
  updated_at = now();

insert into public.payment_method_settings (
  id, method_code, method_type, display_name, bank_name, account_number,
  account_holder, instructions, expires_in_hours, sort_order, is_active,
  created_by, updated_by
) values (
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  'bank_transfer',
  'bank_transfer',
  'Transfer Bank E2E',
  'Bank Staging',
  '0000000000',
  'DEBRODER E2E',
  'Fixture only',
  24,
  1,
  true,
    '42512f1c-e0d3-46bf-8289-158cb72c9222',
    '42512f1c-e0d3-46bf-8289-158cb72c9222'
)
on conflict (id) do update set
  method_code = excluded.method_code,
  method_type = excluded.method_type,
  display_name = excluded.display_name,
  bank_name = excluded.bank_name,
  account_number = excluded.account_number,
  account_holder = excluded.account_holder,
  instructions = excluded.instructions,
  expires_in_hours = excluded.expires_in_hours,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active,
  updated_by = excluded.updated_by,
  archived_at = null,
  updated_at = now();

commit;
