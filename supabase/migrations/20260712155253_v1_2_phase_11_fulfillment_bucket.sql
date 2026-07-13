insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('fulfillment-proofs','fulfillment-proofs',false,10485760,array['image/png','image/jpeg','image/webp','application/pdf'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
