-- DEBRODER v1.2 Phase 11 — evidence, archive, and restore lifecycle.

create or replace function public.register_fulfillment_file(
  p_fulfillment_id uuid,p_file_type text,p_path text,p_file_name text,p_mime_type text,p_size_bytes bigint
)
returns public.fulfillment_files
language plpgsql
security definer
set search_path=''
as $$
declare result_row public.fulfillment_files;
begin
  if not public.has_permission('shipping.update') then raise exception 'Tidak berwenang mengunggah bukti penyerahan'; end if;
  if p_file_type not in ('handover','signature','photo','document') then raise exception 'Jenis bukti tidak valid'; end if;
  if p_mime_type not in ('image/png','image/jpeg','image/webp','application/pdf') then raise exception 'Tipe file tidak valid'; end if;
  if p_size_bytes<=0 or p_size_bytes>10485760 then raise exception 'Ukuran file tidak valid'; end if;
  perform 1 from public.fulfillments
  where id=p_fulfillment_id and archived_at is null and status not in ('delivered','picked_up','cancelled');
  if not found then raise exception 'Dokumen penyerahan tidak dapat menerima file pada status ini'; end if;
  insert into public.fulfillment_files(fulfillment_id,path,file_type,file_name,mime_type,size_bytes,uploaded_by)
  values(p_fulfillment_id,p_path,p_file_type,p_file_name,p_mime_type,p_size_bytes,auth.uid())
  returning * into result_row;
  return result_row;
end $$;

create or replace function public.remove_fulfillment_file(p_file_id uuid)
returns public.fulfillment_files
language plpgsql
security definer
set search_path=''
as $$
declare result_row public.fulfillment_files;
begin
  if not public.has_permission('shipping.update') then raise exception 'Tidak berwenang menghapus bukti penyerahan'; end if;
  select file_row.* into result_row
  from public.fulfillment_files file_row
  join public.fulfillments fulfillment_row on fulfillment_row.id=file_row.fulfillment_id
  where file_row.id=p_file_id and fulfillment_row.archived_at is null
    and fulfillment_row.status not in ('delivered','picked_up','cancelled')
  for update of file_row;
  if not found then raise exception 'Bukti penyerahan tidak dapat dihapus'; end if;
  delete from public.fulfillment_files where id=result_row.id;
  return result_row;
end $$;

create or replace function public.archive_fulfillment(p_fulfillment_id uuid,p_reason text default null)
returns public.fulfillments
language plpgsql
security definer
set search_path=''
as $$
declare result_row public.fulfillments; reason_value text:=nullif(btrim(coalesce(p_reason,'')),'');
begin
  if not public.has_permission('shipping.archive') then raise exception 'Tidak berwenang mengarsipkan penyerahan'; end if;
  if reason_value is null then raise exception 'Alasan arsip wajib diisi'; end if;
  update public.fulfillments set
    archived_at=now(),archived_by=auth.uid(),archive_reason=reason_value,
    updated_by=auth.uid(),updated_at=now()
  where id=p_fulfillment_id and archived_at is null
    and status in ('preparing','delivered','picked_up','cancelled')
  returning * into result_row;
  if not found then raise exception 'Penyerahan harus berstatus Persiapan, Selesai, Diambil, atau Dibatalkan sebelum diarsipkan'; end if;
  insert into public.fulfillment_status_history(fulfillment_id,from_status,to_status,note,reason,changed_by,metadata)
  values(result_row.id,result_row.status,result_row.status,'Dipindahkan ke Gudang Arsip',reason_value,auth.uid(),jsonb_build_object('action','archived','phase','11'));
  perform public.refresh_order_fulfillment_status(result_row.order_id);
  return result_row;
end $$;

create or replace function public.restore_fulfillment(p_fulfillment_id uuid)
returns public.fulfillments
language plpgsql
security definer
set search_path=''
as $$
declare
  result_row public.fulfillments;
  item_row public.fulfillment_items;
  passed_limit integer;
  allocated_quantity integer;
begin
  if not public.has_permission('shipping.archive') then raise exception 'Tidak berwenang memulihkan penyerahan'; end if;
  select * into result_row from public.fulfillments where id=p_fulfillment_id and archived_at is not null for update;
  if not found then raise exception 'Dokumen arsip tidak ditemukan'; end if;

  if result_row.status='preparing' then
    for item_row in select * from public.fulfillment_items where fulfillment_id=result_row.id loop
      select q.passed_quantity into passed_limit from public.qc_records q
      where q.work_item_id=item_row.work_item_id and q.result='passed' and q.archived_at is null
      order by q.attempt_number desc limit 1;
      select coalesce(sum(fi.quantity),0)::integer into allocated_quantity
      from public.fulfillment_items fi
      join public.fulfillments f on f.id=fi.fulfillment_id
      where fi.work_item_id=item_row.work_item_id and f.id<>result_row.id
        and f.status<>'cancelled' and (f.archived_at is null or f.status in ('delivered','picked_up'));
      if allocated_quantity+item_row.quantity>coalesce(passed_limit,0) then
        raise exception 'Jumlah item sudah dialokasikan ke penyerahan lain';
      end if;
    end loop;
  end if;

  update public.fulfillments set archived_at=null,archived_by=null,archive_reason=null,updated_by=auth.uid(),updated_at=now()
  where id=result_row.id returning * into result_row;
  insert into public.fulfillment_status_history(fulfillment_id,from_status,to_status,note,changed_by,metadata)
  values(result_row.id,result_row.status,result_row.status,'Dipulihkan dari Gudang Arsip',auth.uid(),jsonb_build_object('action','restored','phase','11'));
  perform public.refresh_order_fulfillment_status(result_row.order_id);
  return result_row;
end $$;
