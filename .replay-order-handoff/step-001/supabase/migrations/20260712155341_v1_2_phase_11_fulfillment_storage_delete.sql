create policy "staff delete fulfillment proof objects" on storage.objects
for delete to authenticated
using(bucket_id='fulfillment-proofs' and public.has_permission('shipping.update'));
