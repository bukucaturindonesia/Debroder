begin;

-- Custom Commerce CMS alignment.
-- This migration is additive and contains no fixed category, product, service,
-- price, minimum-order, or lead-time business data.

create unique index if not exists custom_categories_source_product_category_uidx
  on public.custom_categories(source_product_category_id)
  where source_product_category_id is not null;

-- The public website only needs to know whether the owner has started managing
-- the dedicated Custom CMS. No draft fields or private content are exposed.
create or replace function public.has_custom_catalog_configuration()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists(select 1 from public.custom_categories)
$$;

revoke all on function public.has_custom_catalog_configuration() from public;
grant execute on function public.has_custom_catalog_configuration() to anon, authenticated, service_role;

-- Keep the Custom CMS aligned with the canonical DEBRODER admin roles. Admin
-- Guest remains read-only because has_staff_role fails closed for admin_guest.
do $$
declare
  table_name text;
  policy_name text;
begin
  for table_name, policy_name in
    select value.table_name, value.policy_name
    from (values
      ('custom_categories', 'Staff manage custom categories'),
      ('custom_category_products', 'Staff manage custom product mappings'),
      ('custom_presets', 'Staff manage custom presets'),
      ('custom_placements', 'Staff manage custom placements'),
      ('custom_print_sizes', 'Staff manage custom print sizes'),
      ('custom_service_compatibilities', 'Staff manage custom compatibility'),
      ('custom_personalization_rules', 'Staff manage personalization')
    ) as value(table_name, policy_name)
  loop
    execute format('drop policy if exists %I on public.%I', policy_name, table_name);
    execute format(
      'create policy %I on public.%I for all to authenticated using (public.has_staff_role(array[''owner'',''superadmin'',''super_admin'',''admin'',''sales_admin''])) with check (public.has_staff_role(array[''owner'',''superadmin'',''super_admin'',''admin'',''sales_admin'']))',
      policy_name,
      table_name
    );
  end loop;
end
$$;

-- Create draft Custom categories and product mappings from the PIM. The RPC
-- never publishes content, never invents prices, and never overwrites owner
-- editorial fields. Publishing remains an explicit CMS action.
create or replace function public.sync_custom_catalog_drafts_from_pim()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  inserted_categories integer := 0;
  inserted_mappings integer := 0;
begin
  if not public.has_staff_role(array['owner','superadmin','super_admin','admin','sales_admin']) then
    raise exception 'Tidak berwenang mengelola CMS Custom';
  end if;

  -- Adopt an owner-created row with the same slug instead of creating a
  -- duplicate. Editorial fields remain untouched.
  update public.custom_categories custom_category
  set source_product_category_id = product_category.id,
      updated_at = now()
  from public.product_categories product_category
  where custom_category.source_product_category_id is null
    and custom_category.slug = product_category.slug
    and product_category.status = 'active'
    and product_category.is_active = true
    and not exists (
      select 1
      from public.custom_categories existing_source
      where existing_source.source_product_category_id = product_category.id
    );

  insert into public.custom_categories(
    name,
    slug,
    short_description,
    image_url,
    image_alt,
    entry_type,
    target_route,
    supports_quick_custom,
    supports_full_custom,
    price_display_mode,
    minimum_order_display,
    lead_time_display,
    source_product_category_id,
    status,
    is_active,
    sort_order
  )
  select
    category.name,
    category.slug,
    category.description,
    image_row.image_url,
    category.name,
    'project_builder',
    null,
    false,
    true,
    'estimated',
    case
      when minimum_row.minimum_quantity is not null then 'Minimum ' || minimum_row.minimum_quantity::text || ' pcs'
      else 'Minimum mengikuti produk'
    end,
    'Estimasi setelah konfigurasi',
    category.id,
    'draft',
    true,
    category.sort_order
  from public.product_categories category
  left join lateral (
    select image.image_url
    from public.products product
    join public.product_variants variant on variant.product_id = product.id
    join public.product_variant_images image on image.variant_id = variant.id
    where product.product_category_id = category.id
      and product.status = 'active'
      and product.status_aktif = true
      and variant.status = 'active'
      and variant.is_active = true
    order by variant.is_default desc, (image.image_role = 'front') desc, image.sort_order, image.created_at
    limit 1
  ) image_row on true
  left join lateral (
    select min(rule.minimum_quantity)::integer as minimum_quantity
    from public.products product
    join public.product_minimum_rules rule on rule.product_id = product.id and rule.status = 'active'
    where product.product_category_id = category.id
      and product.status = 'active'
      and product.status_aktif = true
  ) minimum_row on true
  where category.status = 'active'
    and category.is_active = true
    and exists (
      select 1
      from public.products product
      where product.product_category_id = category.id
        and product.status = 'active'
        and product.status_aktif = true
    )
  on conflict do nothing;

  get diagnostics inserted_categories = row_count;

  update public.custom_category_products mapping
  set is_active = false,
      is_default = false,
      updated_at = now()
  from public.custom_categories custom_category
  where custom_category.id = mapping.custom_category_id
    and custom_category.source_product_category_id is not null
    and not exists (
      select 1
      from public.products product
      where product.id = mapping.product_id
        and product.product_category_id = custom_category.source_product_category_id
        and product.status = 'active'
        and product.status_aktif = true
    );

  insert into public.custom_category_products(
    custom_category_id,
    product_id,
    is_default,
    compatibility_metadata,
    is_active,
    sort_order
  )
  select
    custom_category.id,
    product.id,
    false,
    '{}'::jsonb,
    true,
    product.urutan
  from public.custom_categories custom_category
  join public.products product
    on product.product_category_id = custom_category.source_product_category_id
   and product.status = 'active'
   and product.status_aktif = true
  where custom_category.source_product_category_id is not null
  on conflict (custom_category_id, product_id) do update
  set is_active = true,
      sort_order = excluded.sort_order,
      updated_at = now();

  get diagnostics inserted_mappings = row_count;

  with first_mapping as (
    select distinct on (mapping.custom_category_id)
      mapping.id
    from public.custom_category_products mapping
    where mapping.is_active
      and not exists (
        select 1
        from public.custom_category_products active_default
        where active_default.custom_category_id = mapping.custom_category_id
          and active_default.is_active
          and active_default.is_default
      )
    order by mapping.custom_category_id, mapping.sort_order, mapping.created_at, mapping.id
  )
  update public.custom_category_products mapping
  set is_default = true,
      updated_at = now()
  from first_mapping
  where mapping.id = first_mapping.id;

  return jsonb_build_object(
    'categories_created', inserted_categories,
    'product_mappings_synced', inserted_mappings
  );
end
$$;

revoke all on function public.sync_custom_catalog_drafts_from_pim() from public, anon;
grant execute on function public.sync_custom_catalog_drafts_from_pim() to authenticated, service_role;


insert into public.debroder_schema_versions(version_key, description)
values ('custom_commerce_cms_alignment_v1', 'Custom CMS fallback, canonical admin access, and PIM draft synchronization')
on conflict(version_key) do update
set description = excluded.description,
    applied_at = now();

commit;
