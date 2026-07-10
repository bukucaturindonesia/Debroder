-- DEBRODER Trust & Tentang singleton migration
-- Keeps the most recently updated active row, removes duplicates,
-- and prevents a second row from being inserted in the future.

begin;

lock table public.trust_about_content in share row exclusive mode;

with ranked as (
  select
    id,
    row_number() over (
      order by
        status_aktif desc,
        updated_at desc nulls last,
        created_at desc nulls last,
        id desc
    ) as row_number
  from public.trust_about_content
)
delete from public.trust_about_content target
using ranked
where target.id = ranked.id
  and ranked.row_number > 1;

-- A unique index on a constant expression guarantees a true singleton table.
create unique index if not exists trust_about_content_singleton_unique_idx
  on public.trust_about_content ((1));

commit;
