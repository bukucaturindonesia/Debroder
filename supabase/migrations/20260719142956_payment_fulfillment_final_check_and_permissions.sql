alter table public.fulfillments
  add column if not exists final_verification_checklist jsonb,
  add column if not exists final_verified_at timestamptz,
  add column if not exists final_verified_by uuid references auth.users(id) on delete set null,
  add column if not exists final_verification_note text;

create or replace function public.complete_fulfillment_final_verification(
  p_fulfillment_id uuid,
  p_checklist jsonb,
  p_note text,
  p_expected_updated_at timestamptz
)
returns public.fulfillments
language plpgsql
security definer
set search_path=''
as $$
declare
  result_row public.fulfillments;
  order_row public.orders;
  required_key text;
  is_custom boolean;
begin
  if not public.has_permission('shipping.update') then
    raise exception 'Tidak berwenang melakukan pengecekan akhir';
  end if;
  select * into result_row from public.fulfillments
  where id=p_fulfillment_id and archived_at is null for update;
  if not found then raise exception 'Dokumen penyerahan tidak ditemukan'; end if;
  if result_row.status<>'packing' then
    raise exception 'Pengecekan akhir hanya tersedia setelah packing';
  end if;
  if result_row.updated_at is distinct from p_expected_updated_at then
    raise exception 'Data ini telah diperbarui oleh admin lain';
  end if;
  select * into order_row from public.orders where id=result_row.order_id for update;
  if not found then raise exception 'Pesanan tidak ditemukan'; end if;
  if not coalesce(order_row.payment_production_eligible,false) then
    raise exception 'Syarat pembayaran belum terpenuhi';
  end if;
  if coalesce(jsonb_typeof(p_checklist),'')<>'object' then
    raise exception 'Checklist pengecekan akhir tidak valid';
  end if;
  is_custom:=case
    when jsonb_typeof(order_row.custom_project_snapshot)='array'
      then jsonb_array_length(order_row.custom_project_snapshot)>0
    else false end;

  foreach required_key in array array[
    'order_number','customer','phone','product','variant','color','size',
    'quantity','package_content','package_count','fulfillment_method','package_condition'
  ] loop
    if coalesce((p_checklist->>required_key)::boolean,false) is not true then
      raise exception 'Checklist pengecekan akhir belum lengkap';
    end if;
  end loop;
  if is_custom then
    foreach required_key in array array[
      'method','design','placement','print_size','personalization','qc'
    ] loop
      if coalesce((p_checklist->>required_key)::boolean,false) is not true then
        raise exception 'Checklist Custom dan QC belum lengkap';
      end if;
    end loop;
  end if;
  if result_row.method='shipping' then
    foreach required_key in array array['recipient_address','postal_code'] loop
      if coalesce((p_checklist->>required_key)::boolean,false) is not true then
        raise exception 'Checklist penerima pengiriman belum lengkap';
      end if;
    end loop;
  end if;

  update public.fulfillments set
    final_verification_checklist=p_checklist,
    final_verified_at=now(),final_verified_by=auth.uid(),
    final_verification_note=nullif(btrim(coalesce(p_note,'')),''),
    updated_by=auth.uid(),updated_at=now()
  where id=result_row.id returning * into result_row;
  insert into public.fulfillment_status_history(
    fulfillment_id,from_status,to_status,note,changed_by,metadata
  ) values (
    result_row.id,'packing','packing','Pengecekan akhir fulfillment selesai',
    auth.uid(),jsonb_build_object(
      'event','fulfillment_final_verification_completed','is_custom',is_custom
    )
  );
  return result_row;
end;
$$;

create or replace function public.guard_fulfillment_final_verification()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
begin
  if old.status='packing'
     and new.status in ('ready_to_ship','ready_for_pickup')
     and new.final_verified_at is null then
    raise exception 'Pengecekan akhir wajib diselesaikan sebelum pengiriman atau pickup';
  end if;
  if old.status='packing' and new.status='packing'
     and (old.receiver_name,old.receiver_phone,old.destination,old.courier,
          old.tracking_number,old.package_count)
       is distinct from
         (new.receiver_name,new.receiver_phone,new.destination,new.courier,
          new.tracking_number,new.package_count) then
    new.final_verification_checklist:=null;
    new.final_verified_at:=null;
    new.final_verified_by:=null;
    new.final_verification_note:=null;
  end if;
  return new;
end;
$$;

drop trigger if exists guard_custom_fulfillment_final_verification_v1
  on public.fulfillments;
drop trigger if exists guard_fulfillment_final_verification
  on public.fulfillments;
create trigger guard_fulfillment_final_verification
before update on public.fulfillments
for each row execute function public.guard_fulfillment_final_verification();

revoke all on function public.upsert_payment_method_setting(
  uuid,text,text,text,text,text,text,text,text,integer,integer,boolean
) from public,anon,authenticated;
grant execute on function public.upsert_payment_method_setting(
  uuid,text,text,text,text,text,text,text,text,integer,integer,boolean
) to authenticated,service_role;

revoke all on function public.submit_customer_order_payment_v2(
  text,text,bigint,timestamptz,uuid,text,text,text,text,text,text,text,text,bigint
) from public,anon,authenticated;
grant execute on function public.submit_customer_order_payment_v2(
  text,text,bigint,timestamptz,uuid,text,text,text,text,text,text,text,text,bigint
) to service_role;

revoke all on function public.review_order_payment(
  uuid,text,uuid,boolean,boolean,boolean,boolean,boolean,bigint,text,timestamptz,
  text,text,text,timestamptz
) from public,anon,authenticated;
grant execute on function public.review_order_payment(
  uuid,text,uuid,boolean,boolean,boolean,boolean,boolean,bigint,text,timestamptz,
  text,text,text,timestamptz
) to authenticated,service_role;

revoke all on function public.complete_fulfillment_final_verification(
  uuid,jsonb,text,timestamptz
) from public,anon,authenticated;
grant execute on function public.complete_fulfillment_final_verification(
  uuid,jsonb,text,timestamptz
) to authenticated,service_role;
revoke all on function public.guard_fulfillment_final_verification()
  from public,anon,authenticated;

revoke all on function public.verify_order_payment(uuid,text)
  from public,anon,authenticated;
revoke all on function public.reject_order_payment(uuid,text)
  from public,anon,authenticated;
grant execute on function public.verify_order_payment(uuid,text) to service_role;
grant execute on function public.reject_order_payment(uuid,text) to service_role;

revoke all on function public.refresh_order_payment_summary(uuid)
  from public,anon,authenticated;
grant execute on function public.refresh_order_payment_summary(uuid) to service_role;;
