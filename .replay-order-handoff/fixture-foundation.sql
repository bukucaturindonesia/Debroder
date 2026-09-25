begin;

insert into public.stores (
  id, name, slug, nama_store, layanan_utama, alamat, whatsapp,
  whatsapp_link, maps_link, status_aktif, status
) values
  (
    '11111111-1111-4111-8111-111111111111',
    'DEBRODER E2E Store A',
    'debroder-e2e-store-a',
    'DEBRODER E2E Store A',
    'Ready Stock dan Custom Order',
    'Alamat staging Store A',
    '+6281111111111',
    'https://wa.me/6281111111111',
    'https://maps.example.invalid/debroder-e2e-store-a',
    true,
    'published'
  ),
  (
    '33333333-3333-4333-8333-333333333333',
    'DEBRODER E2E Store B',
    'debroder-e2e-store-b',
    'DEBRODER E2E Store B',
    'Ready Stock dan Custom Order',
    'Alamat staging Store B',
    '+6281222222222',
    'https://wa.me/6281222222222',
    'https://maps.example.invalid/debroder-e2e-store-b',
    true,
    'published'
  )
on conflict (id) do update set
  name = excluded.name,
  slug = excluded.slug,
  nama_store = excluded.nama_store,
  layanan_utama = excluded.layanan_utama,
  alamat = excluded.alamat,
  whatsapp = excluded.whatsapp,
  whatsapp_link = excluded.whatsapp_link,
  maps_link = excluded.maps_link,
  status_aktif = excluded.status_aktif,
  status = excluded.status,
  updated_at = now();

insert into public.profiles (
  id, email, display_name, role, account_status, primary_store_id,
  all_store_access, activated_at
) values
  (
    '42512f1c-e0d3-46bf-8289-158cb72c9222',
    'debroder.e2e.fulladmin@example.com',
    'DEBRODER E2E Full Admin',
    'superadmin',
    'ACTIVE',
    '11111111-1111-4111-8111-111111111111',
    true,
    now()
  ),
  (
    'b4936700-6085-4b26-97fe-0f686edcaeec',
    'debroder.e2e.adminguest@example.com',
    'DEBRODER E2E Admin Guest',
    'admin_guest',
    'ACTIVE',
    '11111111-1111-4111-8111-111111111111',
    false,
    now()
  ),
  (
    'c2f85ece-7013-47c8-a484-2602b08e7def',
    'debroder.e2e.scopedadmin@example.com',
    'DEBRODER E2E Scoped Admin',
    'admin',
    'ACTIVE',
    '11111111-1111-4111-8111-111111111111',
    false,
    now()
  )
on conflict (id) do update set
  display_name = excluded.display_name,
  role = excluded.role,
  account_status = excluded.account_status,
  primary_store_id = excluded.primary_store_id,
  all_store_access = excluded.all_store_access,
  activated_at = excluded.activated_at,
  updated_at = now();

insert into public.customer_profiles (
  id, email, full_name, phone, account_status, email_verified_at,
  terms_accepted_at
) values
  (
    '6be061d1-f568-43d6-b862-72b8db29c317',
    'debroder.e2e.customer.a@example.com',
    'DEBRODER E2E Customer A',
    '+6281333333333',
    'ACTIVE',
    now(),
    now()
  ),
  (
    'b5bf6b26-1a96-4487-b621-8973558c42eb',
    'debroder.e2e.customer.b@example.com',
    'DEBRODER E2E Customer B',
    '+6281444444444',
    'ACTIVE',
    now(),
    now()
  )
on conflict (id) do update set
  email = excluded.email,
  full_name = excluded.full_name,
  phone = excluded.phone,
  account_status = excluded.account_status,
  email_verified_at = excluded.email_verified_at,
  terms_accepted_at = excluded.terms_accepted_at,
  updated_at = now();

insert into public.inventory_locations (
  id, code, name, location_type, store_id, is_pickup_enabled, active,
  metadata
) values (
  '44444444-4444-4444-8444-444444444444',
  'DEBRODER-E2E-A',
  'DEBRODER E2E Pickup A',
  'store',
  '11111111-1111-4111-8111-111111111111',
  true,
  true,
  jsonb_build_object('fixture_prefix', 'debroder_e2e_wave0b')
)
on conflict (id) do update set
  code = excluded.code,
  name = excluded.name,
  location_type = excluded.location_type,
  store_id = excluded.store_id,
  is_pickup_enabled = excluded.is_pickup_enabled,
  active = excluded.active,
  metadata = excluded.metadata,
  updated_at = now();

commit;
