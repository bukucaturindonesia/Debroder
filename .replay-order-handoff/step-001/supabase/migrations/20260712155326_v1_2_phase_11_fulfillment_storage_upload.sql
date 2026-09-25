create policy "staff upload fulfillment proof objects" on storage.objects
for insert to authenticated
with check(bucket_id='fulfillment-proofs' and owner=auth.uid() and public.has_permission('shipping.update'));
