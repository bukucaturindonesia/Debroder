begin;

insert into public.quotations (
  id, quotation_number, customer_id, customer_name, customer_email,
  customer_phone, status, currency, product_subtotal, service_subtotal,
  additional_cost, discount_total, current_version, created_by, updated_by
) values (
  'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  'DEBRODER-E2E-QUO-0001',
  '6be061d1-f568-43d6-b862-72b8db29c317',
  'DEBRODER E2E Customer A',
  'debroder.e2e.customer.a@example.com',
  '+6281333333333',
  'draft',
  'IDR',
  0,
  0,
  0,
  0,
  1,
  '42512f1c-e0d3-46bf-8289-158cb72c9222',
  '42512f1c-e0d3-46bf-8289-158cb72c9222'
)
on conflict (id) do update set
  quotation_number = excluded.quotation_number,
  customer_id = excluded.customer_id,
  customer_name = excluded.customer_name,
  customer_email = excluded.customer_email,
  customer_phone = excluded.customer_phone,
  status = excluded.status,
  currency = excluded.currency,
  product_subtotal = excluded.product_subtotal,
  service_subtotal = excluded.service_subtotal,
  additional_cost = excluded.additional_cost,
  discount_total = excluded.discount_total,
  current_version = excluded.current_version,
  updated_by = excluded.updated_by,
  updated_at = now();

commit;
