create policy "staff read fulfillment proof objects" on storage.objects
for select to authenticated
using(bucket_id='fulfillment-proofs' and public.has_staff_role(array['owner','superadmin','super_admin','admin']));
