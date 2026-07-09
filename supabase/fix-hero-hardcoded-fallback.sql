-- DEBRODER: bersihkan teks hardcode/fallback hero landing.
-- Jalankan hanya jika hero landing masih menampilkan teks bawaan seperti
-- "KAOS POLOS NEW STATE APPAREL" padahal admin tidak mengisinya.

alter table if exists public.hero_banners
  alter column badge set default '',
  alter column headline set default '',
  alter column subheadline set default '',
  alter column cta_primary_text set default '',
  alter column cta_primary_link set default '/koleksi',
  alter column cta_secondary_text set default '',
  alter column cta_secondary_link set default '';

update public.hero_banners
set
  badge = case
    when trim(coalesce(badge, '')) in ('KAOS POLOS NEW STATE APPAREL', '.', '-', '—') then ''
    else badge
  end,
  headline = case
    when trim(coalesce(headline, '')) in ('KAOS POLOS NEW STATE APPAREL', '.', '-', '—') then ''
    else headline
  end,
  subheadline = case
    when trim(coalesce(subheadline, '')) in ('Sablon DTF, Jersey, dan Custom Apparel', '.', '-', '—') then ''
    else subheadline
  end,
  title = case
    when trim(coalesce(title, '')) in ('KAOS POLOS NEW STATE APPAREL', '.', '-', '—') then ''
    else title
  end,
  subtitle = case
    when trim(coalesce(subtitle, '')) in ('Sablon DTF, Jersey, dan Custom Apparel', '.', '-', '—') then ''
    else subtitle
  end,
  cta_primary_text = case
    when trim(coalesce(cta_primary_text, '')) in ('Beli Sekarang', '.', '-', '—') then ''
    else cta_primary_text
  end,
  cta_text = case
    when trim(coalesce(cta_text, '')) in ('Beli Sekarang', '.', '-', '—') then ''
    else cta_text
  end,
  updated_at = now()
where
  trim(coalesce(badge, '')) in ('KAOS POLOS NEW STATE APPAREL', '.', '-', '—')
  or trim(coalesce(headline, '')) in ('KAOS POLOS NEW STATE APPAREL', '.', '-', '—')
  or trim(coalesce(subheadline, '')) in ('Sablon DTF, Jersey, dan Custom Apparel', '.', '-', '—')
  or trim(coalesce(title, '')) in ('KAOS POLOS NEW STATE APPAREL', '.', '-', '—')
  or trim(coalesce(subtitle, '')) in ('Sablon DTF, Jersey, dan Custom Apparel', '.', '-', '—')
  or trim(coalesce(cta_primary_text, '')) in ('Beli Sekarang', '.', '-', '—')
  or trim(coalesce(cta_text, '')) in ('Beli Sekarang', '.', '-', '—');
