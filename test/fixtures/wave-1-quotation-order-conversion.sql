-- Disposable staging-only W1 runtime fixture.
--
-- This is data, not a repository migration. Execute only against the
-- owner-approved disposable staging project with the W0 Full Admin test
-- session claim set by the runtime harness. The two quotations are retained
-- for replay/concurrency regression and are intentionally namespaced.

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
  id,
  customer_id,
  customer_name,
  company_name,
  customer_email,
  customer_phone,
  billing_address,
  status,
  currency,
  public_notes,
  internal_notes,
  product_subtotal,
  service_subtotal,
  additional_cost,
  discount_total,
  confirmed_total,
  estimated_total,
  has_pending_pricing,
  current_version,
  created_by,
  updated_by,
  sent_at,
  approved_at
)
values
(
  'a1111111-1111-4111-8111-111111111111',
  '6be061d1-f568-43d6-b862-72b8db29c317',
  'DEBRODER E2E Customer A',
  null,
  'debroder.e2e.customer.a@example.com',
  '+6281333333333',
  null,
  'approved',
  'IDR',
  'Wave 1 pickup runtime fixture.',
  'debroder_e2e_wave1_pickup',
  125000,
  18000,
  0,
  0,
  143000,
  143000,
  false,
  1,
  '42512f1c-e0d3-46bf-8289-158cb72c9222',
  '42512f1c-e0d3-46bf-8289-158cb72c9222',
  now(),
  now()
),
(
  'a2222222-2222-4222-8222-222222222222',
  '6be061d1-f568-43d6-b862-72b8db29c317',
  'DEBRODER E2E Customer A',
  null,
  'debroder.e2e.customer.a@example.com',
  '+6281333333333',
  null,
  'approved',
  'IDR',
  'Wave 1 shipping runtime fixture.',
  'debroder_e2e_wave1_shipping',
  125000,
  18000,
  0,
  0,
  143000,
  143000,
  false,
  1,
  '42512f1c-e0d3-46bf-8289-158cb72c9222',
  '42512f1c-e0d3-46bf-8289-158cb72c9222',
  now(),
  now()
)
on conflict (id) do nothing;

insert into public.quotation_versions (
  id,
  quotation_id,
  version_number,
  version_status,
  snapshot,
  change_note,
  created_by,
  sent_at
)
values
(
  'b1111111-1111-4111-8111-111111111111',
  'a1111111-1111-4111-8111-111111111111',
  1,
  'sent',
  jsonb_build_object(
    'contract', 'debroder_e2e_wave1',
    'custom_project_snapshot', '[]'::jsonb,
    'fixture', 'pickup'
  ),
  'W1 pickup runtime fixture',
  '42512f1c-e0d3-46bf-8289-158cb72c9222',
  now()
),
(
  'b2222222-2222-4222-8222-222222222222',
  'a2222222-2222-4222-8222-222222222222',
  1,
  'sent',
  jsonb_build_object(
    'contract', 'debroder_e2e_wave1',
    'custom_project_snapshot', '[]'::jsonb,
    'fixture', 'shipping'
  ),
  'W1 shipping runtime fixture',
  '42512f1c-e0d3-46bf-8289-158cb72c9222',
  now()
)
on conflict (id) do nothing;

update public.quotations
set latest_version_id = case id
      when 'a1111111-1111-4111-8111-111111111111' then 'b1111111-1111-4111-8111-111111111111'::uuid
      when 'a2222222-2222-4222-8222-222222222222' then 'b2222222-2222-4222-8222-222222222222'::uuid
    end,
    sent_version_id = case id
      when 'a1111111-1111-4111-8111-111111111111' then 'b1111111-1111-4111-8111-111111111111'::uuid
      when 'a2222222-2222-4222-8222-222222222222' then 'b2222222-2222-4222-8222-222222222222'::uuid
    end,
    approved_version_id = case id
      when 'a1111111-1111-4111-8111-111111111111' then 'b1111111-1111-4111-8111-111111111111'::uuid
      when 'a2222222-2222-4222-8222-222222222222' then 'b2222222-2222-4222-8222-222222222222'::uuid
    end,
    updated_at = now(),
    updated_by = '42512f1c-e0d3-46bf-8289-158cb72c9222'
where id in (
  'a1111111-1111-4111-8111-111111111111',
  'a2222222-2222-4222-8222-222222222222'
);

insert into public.quotation_items (
  id,
  quotation_id,
  product_id,
  product_variant_id,
  product_variant_size_id,
  product_name_snapshot,
  product_slug_snapshot,
  variant_name_snapshot,
  color_name_snapshot,
  color_hex_snapshot,
  size_name_snapshot,
  sku_snapshot,
  quantity,
  base_price_snapshot,
  tier_price_snapshot,
  unit_price,
  pricing_status,
  subtotal,
  customer_notes,
  sort_order
)
values
(
  'c1111111-1111-4111-8111-111111111111',
  'a1111111-1111-4111-8111-111111111111',
  '77777777-7777-4777-8777-777777777777',
  '88888888-8888-4888-8888-888888888888',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  'DEBRODER E2E Ready Stock',
  'debroder-e2e-ready-stock',
  'E2E Ready Stock',
  'Black',
  '#111111',
  'M',
  'DEBRODER-E2E-RS-BLK-M',
  1,
  125000,
  125000,
  125000,
  'confirmed',
  125000,
  'W1 pickup line item.',
  1
),
(
  'c2222222-2222-4222-8222-222222222222',
  'a2222222-2222-4222-8222-222222222222',
  '77777777-7777-4777-8777-777777777777',
  '88888888-8888-4888-8888-888888888888',
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  'DEBRODER E2E Ready Stock',
  'debroder-e2e-ready-stock',
  'E2E Ready Stock',
  'Black',
  '#111111',
  'M',
  'DEBRODER-E2E-RS-BLK-M',
  1,
  125000,
  125000,
  125000,
  'confirmed',
  125000,
  'W1 shipping line item.',
  1
)
on conflict (id) do nothing;

insert into public.quotation_item_services (
  id,
  quotation_item_id,
  custom_service_id,
  service_name_snapshot,
  quantity,
  position,
  pricing_status,
  unit_price,
  subtotal,
  notes,
  sort_order
)
values
(
  'd1111111-1111-4111-8111-111111111111',
  'c1111111-1111-4111-8111-111111111111',
  'b118dbe1-11c4-4d03-9c0e-3a4abe784f54',
  'Sablon DTF',
  1,
  'front',
  'confirmed',
  18000,
  18000,
  'W1 pickup service.',
  1
),
(
  'd2222222-2222-4222-8222-222222222222',
  'c2222222-2222-4222-8222-222222222222',
  'b118dbe1-11c4-4d03-9c0e-3a4abe784f54',
  'Sablon DTF',
  1,
  'front',
  'confirmed',
  18000,
  18000,
  'W1 shipping service.',
  1
)
on conflict (id) do nothing;

insert into public.mockup_sets (
  id,
  quotation_id,
  title,
  status,
  notes,
  created_by,
  updated_by
)
values
(
  'e1111111-1111-4111-8111-111111111111',
  'a1111111-1111-4111-8111-111111111111',
  'W1 Pickup Approved Mockup',
  'approved',
  'debroder_e2e_wave1 pickup fixture',
  '42512f1c-e0d3-46bf-8289-158cb72c9222',
  '42512f1c-e0d3-46bf-8289-158cb72c9222'
),
(
  'e2222222-2222-4222-8222-222222222222',
  'a2222222-2222-4222-8222-222222222222',
  'W1 Shipping Approved Mockup',
  'approved',
  'debroder_e2e_wave1 shipping fixture',
  '42512f1c-e0d3-46bf-8289-158cb72c9222',
  '42512f1c-e0d3-46bf-8289-158cb72c9222'
)
on conflict (id) do nothing;

insert into public.mockup_approval_history (
  mockup_set_id,
  action,
  from_status,
  to_status,
  note,
  changed_by
)
values
(
  'e1111111-1111-4111-8111-111111111111',
  'approved',
  'ready_for_review',
  'approved',
  'W1 pickup runtime fixture.',
  '42512f1c-e0d3-46bf-8289-158cb72c9222'
),
(
  'e2222222-2222-4222-8222-222222222222',
  'approved',
  'ready_for_review',
  'approved',
  'W1 shipping runtime fixture.',
  '42512f1c-e0d3-46bf-8289-158cb72c9222'
);

commit;
