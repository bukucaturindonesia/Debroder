-- DEBRODER Custom Checkout structured-address verification.
-- READ-ONLY. Run after the owner applies all three region migrations.

select level, count(*) as active_rows
from public.indonesia_regions
where is_active
group by level
order by level;

select count(*) as active_villages
from public.indonesia_regions
where level = 'village'
  and is_active;

select count(distinct postal_code) as distinct_postal_codes
from public.indonesia_regions region,
lateral unnest(region.postal_codes) postal_code
where region.level = 'village'
  and region.is_active;

select count(*) as orphan_villages
from public.indonesia_regions village
left join public.indonesia_regions district
  on district.code = village.parent_code
 and district.level = 'district'
 and district.is_active
where village.level = 'village'
  and village.is_active
  and district.code is null;

select count(*) as invalid_village_postal_rows
from public.indonesia_regions region
where region.level = 'village'
  and region.is_active
  and (
    cardinality(region.postal_codes) = 0
    or exists (
      select 1
      from unnest(region.postal_codes) postal_code
      where postal_code !~ '^[0-9]{5}$'
    )
  );

select code, parent_code, name, postal_codes
from public.indonesia_regions
where level = 'village'
  and parent_code = '73.71.01'
  and is_active
order by name
limit 25;

select order_id,
       fulfillment_method,
       province_id,
       regency_id,
       district_id,
       village_id,
       postal_code,
       formatted_address,
       created_at
from public.order_address_snapshots
order by created_at desc
limit 10;
