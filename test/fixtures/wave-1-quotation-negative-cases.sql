-- Disposable staging-only W1 negative-input fixtures.
-- These quotations are intentionally not eligible for conversion.

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
  currency, internal_notes, product_subtotal, service_subtotal,
  confirmed_total, estimated_total, has_pending_pricing, current_version,
  created_by, updated_by
)
values
(
  'a4444444-4444-4444-8444-444444444444',
  '6be061d1-f568-43d6-b862-72b8db29c317',
  'DEBRODER E2E Customer A',
  'debroder.e2e.customer.a@example.com',
  '+6281333333333', 'approved', 'IDR',
  'debroder_e2e_wave1_pending_pricing', 125000, 18000,
  143000, 143000, true, 1,
  '42512f1c-e0d3-46bf-8289-158cb72c9222',
  '42512f1c-e0d3-46bf-8289-158cb72c9222'
),
(
  'a5555555-5555-4555-8555-555555555555',
  '6be061d1-f568-43d6-b862-72b8db29c317',
  'DEBRODER E2E Customer A',
  'debroder.e2e.customer.a@example.com',
  '+6281333333333', 'approved', 'IDR',
  'debroder_e2e_wave1_invalid_input', 0, 0,
  143000, 143000, false, 1,
  '42512f1c-e0d3-46bf-8289-158cb72c9222',
  '42512f1c-e0d3-46bf-8289-158cb72c9222'
),
(
  'a6666666-6666-4666-8666-666666666666',
  '6be061d1-f568-43d6-b862-72b8db29c317',
  'DEBRODER E2E Customer A',
  'debroder.e2e.customer.a@example.com',
  '+6281333333333', 'approved', 'IDR',
  'debroder_e2e_wave1_invalid_version', 0, 0,
  143000, 143000, false, 1,
  '42512f1c-e0d3-46bf-8289-158cb72c9222',
  '42512f1c-e0d3-46bf-8289-158cb72c9222'
)
on conflict (id) do nothing;

update public.quotations
set confirmed_total = 143000,
    estimated_total = 143000,
    updated_at = now(),
    updated_by = '42512f1c-e0d3-46bf-8289-158cb72c9222'
where id = 'a5555555-5555-4555-8555-555555555555';

insert into public.quotation_versions (
  id, quotation_id, version_number, version_status, snapshot,
  change_note, created_by, sent_at
)
values (
  'b5555555-5555-4555-8555-555555555555',
  'a5555555-5555-4555-8555-555555555555', 1, 'sent',
  jsonb_build_object('contract', 'debroder_e2e_wave1', 'fixture', 'negative'),
  'W1 negative-input fixture',
  '42512f1c-e0d3-46bf-8289-158cb72c9222', now()
)
on conflict (id) do nothing;

update public.quotations
set latest_version_id = 'b5555555-5555-4555-8555-555555555555',
    sent_version_id = 'b5555555-5555-4555-8555-555555555555',
    approved_version_id = 'b5555555-5555-4555-8555-555555555555',
    updated_at = now(),
    updated_by = '42512f1c-e0d3-46bf-8289-158cb72c9222'
where id = 'a5555555-5555-4555-8555-555555555555';

commit;
