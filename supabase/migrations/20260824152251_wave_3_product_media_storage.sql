-- DEBRODER W3-PIM-003 — restore the canonical public product-media contract.
--
-- The repository schema and all Product/PIM/public image paths use
-- `website-images`. This forward migration repairs staging drift without
-- renaming the bucket, weakening existing Admin Guest restrictions, or
-- changing any historical migration.

begin;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'website-images',
  'website-images',
  true,
  104857600,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'video/mp4',
    'video/webm'
  ]
)
on conflict (id) do update set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can view website images" on storage.objects;
create policy "Public can view website images"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'website-images');

drop policy if exists "Superadmin can upload website images" on storage.objects;
create policy "Superadmin can upload website images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'website-images'
  and public.is_superadmin()
);

drop policy if exists "Superadmin can update website images" on storage.objects;
create policy "Superadmin can update website images"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'website-images'
  and public.is_superadmin()
)
with check (
  bucket_id = 'website-images'
  and public.is_superadmin()
);

drop policy if exists "Superadmin can delete website images" on storage.objects;
create policy "Superadmin can delete website images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'website-images'
  and public.is_superadmin()
);

commit;

-- Rollback note: do not drop the bucket or storage objects. If rollback is
-- required, remove only this migration's policies after an owner-approved
-- replacement contract is in place and preserve uploaded product media.
