select 'V1_0_READY' as check_name,
       case when to_regclass('public.products') is not null
              and to_regclass('public.product_variants') is not null
              and to_regclass('public.product_variant_sizes') is not null
            then 'PASS' else 'FAIL' end as status,
       'Fondasi produk compatibility' as detail
union all
select 'V1_1_READY',
       case when to_regclass('public.product_price_tiers') is not null
              and to_regclass('public.custom_services') is not null
              and to_regclass('public.quotation_drafts') is not null
              and to_regclass('public.customer_uploads') is not null
            then 'PASS' else 'FAIL' end,
       'Bulk ordering, custom services, quotation, upload'
union all
select 'ADMIN_READY',
       case when exists (select 1 from public.profiles where lower(role) in ('owner','superadmin','super_admin','sales_admin','admin'))
            then 'PASS' else 'WARN' end,
       'Profil admin dikenali'
union all
select 'STORAGE_CUSTOMER_DESIGNS',
       case when exists (select 1 from storage.buckets where id='customer-designs' and public=false)
            then 'PASS' else 'FAIL' end,
       'customer-designs harus private';
