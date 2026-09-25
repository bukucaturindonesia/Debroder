-- Disposable staging-only W1 concurrency fixture.
-- Execute only against the owner-approved disposable staging project.

begin;

select set_config(
  'request.jwt.claims',
  json_build_object(
    'sub', '42512f1c-e0d3-46bf-8289-158cb72c9222',
    'role', 'authenticated',
    'session_id', '9f37ba82-401c-451e-b78e-2ac542c21c7d'
  )::text,
  true
);

insert into public.quotations (
  id, customer_id, customer_name, customer_email, customer_phone, status,
  currency, public_notes, internal_notes, product_subtotal, service_subtotal,
  confirmed_total, estimated_total, has_pending_pricing, current_version,
  created_by, updated_by, sent_at, approved_at
)
values (
  'a3333333-3333-4333-8333-333333333333',
  '6be061d1-f568-43d6-b862-72b8db29c317',
  'DEBRODER E2E Customer A',
  'debroder.e2e.customer.a@example.com',
  '+6281333333333',
  'approved', 'IDR', 'Wave 1 concurrency runtime fixture.',
  'debroder_e2e_wave1_concurrency', 125000, 18000, 143000, 143000, false, 1,
  '42512f1c-e0d3-46bf-8289-158cb72c9222',
  '42512f1c-e0d3-46bf-8289-158cb72c9222', now(), now()
)
on conflict (id) do nothing;

insert into public.quotation_versions (
  id, quotation_id, version_number, version_status, snapshot,
  change_note, created_by, sent_at
)
values (
  'b3333333-3333-4333-8333-333333333333',
  'a3333333-3333-4333-8333-333333333333', 1, 'sent',
  jsonb_build_object('contract', 'debroder_e2e_wave1', 'fixture', 'concurrency'),
  'W1 concurrency runtime fixture',
  '42512f1c-e0d3-46bf-8289-158cb72c9222', now()
)
on conflict (id) do nothing;

update public.quotations
set latest_version_id = 'b3333333-3333-4333-8333-333333333333',
    sent_version_id = 'b3333333-3333-4333-8333-333333333333',
    approved_version_id = 'b3333333-3333-4333-8333-333333333333',
    updated_at = now(),
    updated_by = '42512f1c-e0d3-46bf-8289-158cb72c9222'
where id = 'a3333333-3333-4333-8333-333333333333';

insert into public.quotation_items (
  id, quotation_id, product_id, product_variant_id, product_variant_size_id,
  product_name_snapshot, product_slug_snapshot, variant_name_snapshot,
  color_name_snapshot, color_hex_snapshot, size_name_snapshot, sku_snapshot,
  quantity, base_price_snapshot, tier_price_snapshot, unit_price,
  pricing_status, subtotal, customer_notes, sort_order
)
values (
  'c3333333-3333-4333-8333-333333333333',
  'a3333333-3333-4333-8333-333333333333',
  '77777777-7777-4777-8777-777777777777',
  '88888888-8888-4888-8888-888888888888',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  'DEBRODER E2E Ready Stock', 'debroder-e2e-ready-stock', 'E2E Ready Stock',
  'Black', '#111111', 'M', 'DEBRODER-E2E-RS-BLK-M', 1,
  125000, 125000, 125000, 'confirmed', 125000,
  'W1 concurrency line item.', 1
)
on conflict (id) do nothing;

insert into public.quotation_item_services (
  id, quotation_item_id, custom_service_id, service_name_snapshot, quantity,
  position, pricing_status, unit_price, subtotal, notes, sort_order
)
values (
  'd3333333-3333-4333-8333-333333333333',
  'c3333333-3333-4333-8333-333333333333',
  'b118dbe1-11c4-4d03-9c0e-3a4abe784f54', 'Sablon DTF', 1,
  'front', 'confirmed', 18000, 18000, 'W1 concurrency service.', 1
)
on conflict (id) do nothing;

insert into public.mockup_sets (
  id, quotation_id, title, status, notes, created_by, updated_by
)
values (
  'e3333333-3333-4333-8333-333333333333',
  'a3333333-3333-4333-8333-333333333333',
  'W1 Concurrency Approved Mockup', 'approved',
  'debroder_e2e_wave1 concurrency fixture',
  '42512f1c-e0d3-46bf-8289-158cb72c9222',
  '42512f1c-e0d3-46bf-8289-158cb72c9222'
)
on conflict (id) do nothing;

commit;
