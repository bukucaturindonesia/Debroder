begin;

update public.products
set short_detail = 'QA / EXPERIMENTAL - jalur Ready Stock, Custom Instan, dan Full Custom tersedia untuk owner review.',
    image_alt = case
      when image_alt ilike '%pilot%' then 'Jersey Eksperimental DEBRODER'
      else image_alt
    end,
    updated_at = now()
where slug = 'jersey-custom-pilot'
  and status = 'active'
  and status_aktif
  and short_detail ilike '%pilot internal%';

update public.product_variant_images image
set alt_text = replace(image.alt_text, 'Jersey Custom Pilot', 'Jersey Eksperimental DEBRODER')
from public.product_variants variant
join public.products product on product.id = variant.product_id
where image.variant_id = variant.id
  and product.slug = 'jersey-custom-pilot'
  and image.alt_text like '%Jersey Custom Pilot%';

insert into public.system_audit_log(
  entity_type, action, actor_role, source, reason, metadata
) values (
  'product',
  'jersey_experimental_public_copy_corrected',
  'system',
  'migration',
  'Removed contradictory internal-only copy from the owner-authorized public QA product without inventing product specifications.',
  jsonb_build_object('product_created', false, 'media_replaced', false)
);

commit;
