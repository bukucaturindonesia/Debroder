begin;

-- DEBRODER — SUPERADMIN PRODUCT MANAGEMENT PERMISSIONS V1
-- Targeted additive correction only.
-- Aligns DB permissions with existing Product Manager capabilities.

insert into public.permission_definitions(permission_key, module, label, description)
values
  ('product.read', 'product', 'Lihat produk', 'Membaca katalog, varian, media, dan status produk.'),
  ('product.manage', 'product', 'Kelola draft produk', 'Membuat serta mengubah draft, varian, dan media produk.'),
  ('product.inventory.manage', 'product', 'Kelola SKU, harga, dan stok', 'Mengubah sellable SKU, harga, dan stok melalui workflow audited.'),
  ('product.publish', 'product', 'Publikasikan produk', 'Menerbitkan atau mengarsipkan produk setelah validasi.'),
  ('product.maintenance', 'product', 'Pemeliharaan produk', 'Mengakses alat pemeliharaan PIM berisiko tinggi.')
on conflict(permission_key) do update
set module = excluded.module,
    label = excluded.label,
    description = excluded.description;

insert into public.role_permissions(role, permission_key, granted, updated_by, updated_at)
select role_name.role, permission.permission_key, true, null, now()
from (values ('superadmin'), ('super_admin')) as role_name(role)
cross join (values
  ('product.read'),
  ('product.manage'),
  ('product.inventory.manage'),
  ('product.publish'),
  ('product.maintenance')
) as permission(permission_key)
on conflict(role, permission_key) do update
set granted = true,
    updated_by = null,
    updated_at = now();

commit;
