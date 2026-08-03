begin;

alter table public.product_color_master
  add column if not exists color_type text not null default 'solid',
  add column if not exists primary_hex text,
  add column if not exists secondary_hex text,
  add column if not exists tertiary_hex text,
  add column if not exists swatch_direction text not null default 'diagonal',
  add column if not exists pattern_image_url text;

-- Preserve backward compatibility: the existing color_hex remains the canonical
-- fallback while primary_hex becomes the new UI-facing primary color.
update public.product_color_master
set primary_hex = coalesce(primary_hex, color_hex)
where primary_hex is null;

-- Classify known combination colors.
update public.product_color_master
set
  color_type = 'combination',
  secondary_hex = case slug
    when 'black-white' then '#F7F7F4'
    when 'white-grey' then '#BFC2C5'
    when 'gold-grey' then '#BFC2C5'
    when 'royal-blue-charcoal' then '#3A3A3A'
    when 'orange-charcoal' then '#3A3A3A'
    else secondary_hex
  end,
  swatch_direction = 'diagonal'
where slug in (
  'black-white',
  'white-grey',
  'gold-grey',
  'royal-blue-charcoal',
  'orange-charcoal'
);

-- Classify camouflage colors as patterns. A pattern image can be supplied later.
update public.product_color_master
set
  color_type = 'pattern',
  swatch_direction = 'diagonal'
where slug in (
  'forest-camo',
  'black-camo',
  'black-forest-camo'
);

-- Keep every other row solid unless it was explicitly classified above.
update public.product_color_master
set color_type = 'solid'
where slug not in (
  'black-white',
  'white-grey',
  'gold-grey',
  'royal-blue-charcoal',
  'orange-charcoal',
  'forest-camo',
  'black-camo',
  'black-forest-camo'
);

-- Add safe validation constraints only when they do not already exist.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'product_color_master_color_type_check'
      and conrelid = 'public.product_color_master'::regclass
  ) then
    alter table public.product_color_master
      add constraint product_color_master_color_type_check
      check (color_type in ('solid', 'combination', 'pattern'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'product_color_master_swatch_direction_check'
      and conrelid = 'public.product_color_master'::regclass
  ) then
    alter table public.product_color_master
      add constraint product_color_master_swatch_direction_check
      check (swatch_direction in ('vertical', 'horizontal', 'diagonal'));
  end if;
end
$$;

comment on column public.product_color_master.color_type is
  'Swatch type: solid, combination, or pattern.';
comment on column public.product_color_master.primary_hex is
  'Primary UI swatch color. Falls back to legacy color_hex.';
comment on column public.product_color_master.secondary_hex is
  'Secondary UI swatch color for combination colors.';
comment on column public.product_color_master.tertiary_hex is
  'Optional tertiary UI swatch color.';
comment on column public.product_color_master.swatch_direction is
  'Split direction for combination swatches.';
comment on column public.product_color_master.pattern_image_url is
  'Optional image URL for pattern/camouflage swatches.';

commit;;
