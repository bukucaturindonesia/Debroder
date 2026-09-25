begin;

insert into public.orders (
  id, order_number, customer_user_id, customer_id, customer_name,
  company_name, customer_phone, customer_email, status, total_amount,
  subtotal_amount, admin_notes, customer_notes, delivery_method,
  fulfillment_method, checkout_source, payment_method, payment_status,
  payment_requirement_type, payment_required_percentage,
  custom_project_snapshot, pricing_status, pickup_location_id,
  created_by, updated_by
) values (
  '22222222-2222-4222-8222-222222222222',
  'DEBRODER-E2E-OOS-0001',
  'b5bf6b26-1a96-4487-b621-8973558c42eb',
  'b5bf6b26-1a96-4487-b621-8973558c42eb',
  'DEBRODER E2E Customer B',
  null,
  '+6281444444444',
  'debroder.e2e.customer.b@example.com',
  'under_review',
  0,
  0,
  'debroder_e2e_wave0b out-of-scope authorization fixture',
  '',
  'pickup',
  'pickup',
  'admin',
  'bank_transfer',
  'unpaid',
  'full',
  100,
  '[]'::jsonb,
  'final',
  '33333333-3333-4333-8333-333333333333',
  '42512f1c-e0d3-46bf-8289-158cb72c9222',
  '42512f1c-e0d3-46bf-8289-158cb72c9222'
)
on conflict (id) do update set
  customer_user_id = excluded.customer_user_id,
  customer_id = excluded.customer_id,
  customer_name = excluded.customer_name,
  customer_phone = excluded.customer_phone,
  customer_email = excluded.customer_email,
  status = excluded.status,
  total_amount = excluded.total_amount,
  subtotal_amount = excluded.subtotal_amount,
  admin_notes = excluded.admin_notes,
  customer_notes = excluded.customer_notes,
  delivery_method = excluded.delivery_method,
  fulfillment_method = excluded.fulfillment_method,
  checkout_source = excluded.checkout_source,
  payment_method = excluded.payment_method,
  payment_status = excluded.payment_status,
  payment_requirement_type = excluded.payment_requirement_type,
  payment_required_percentage = excluded.payment_required_percentage,
  custom_project_snapshot = excluded.custom_project_snapshot,
  pricing_status = excluded.pricing_status,
  pickup_location_id = excluded.pickup_location_id,
  updated_by = excluded.updated_by,
  updated_at = now();

insert into public.order_store_assignments (
  order_id, receiving_store_id, production_store_id, pickup_store_id,
  reason, updated_by
) values (
  '22222222-2222-4222-8222-222222222222',
  '33333333-3333-4333-8333-333333333333',
  '33333333-3333-4333-8333-333333333333',
  '33333333-3333-4333-8333-333333333333',
  'debroder_e2e_wave0b out-of-scope store assignment',
  '42512f1c-e0d3-46bf-8289-158cb72c9222'
)
on conflict (order_id) do update set
  receiving_store_id = excluded.receiving_store_id,
  production_store_id = excluded.production_store_id,
  pickup_store_id = excluded.pickup_store_id,
  reason = excluded.reason,
  updated_by = excluded.updated_by,
  updated_at = now();

commit;
