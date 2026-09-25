-- DEBRODER Pay-at-Store final verification correction.
-- Already applied to Supabase production.
-- Pickup orders paid at the store may complete packing/final verification before cash is received.
-- Cash is still recorded atomically only during the real pickup handover.

create or replace function public.complete_fulfillment_final_verification(
  p_fulfillment_id uuid,
  p_checklist jsonb,
  p_note text,
  p_expected_updated_at timestamptz
)
returns public.fulfillments
language plpgsql
security definer
set search_path = ''
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

  select * into result_row
  from public.fulfillments
  where id = p_fulfillment_id and archived_at is null
  for update;

  if not found then raise exception 'Dokumen penyerahan tidak ditemukan'; end if;
  if result_row.status <> 'packing' then
    raise exception 'Pengecekan akhir hanya tersedia setelah packing';
  end if;
  if result_row.updated_at is distinct from p_expected_updated_at then
    raise exception 'Data ini telah diperbarui oleh admin lain';
  end if;

  select * into order_row
  from public.orders
  where id = result_row.order_id
  for update;

  if not found then raise exception 'Pesanan tidak ditemukan'; end if;

  if not coalesce(order_row.payment_production_eligible,false)
     and not (
       order_row.payment_method = 'pay_at_store'
       and result_row.method = 'pickup'
     ) then
    raise exception 'Syarat pembayaran belum terpenuhi';
  end if;

  if coalesce(jsonb_typeof(p_checklist),'') <> 'object' then
    raise exception 'Checklist pengecekan akhir tidak valid';
  end if;

  is_custom := case
    when jsonb_typeof(order_row.custom_project_snapshot) = 'array'
      then jsonb_array_length(order_row.custom_project_snapshot) > 0
    else false
  end;

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

  if result_row.method = 'shipping' then
    foreach required_key in array array['recipient_address','postal_code'] loop
      if coalesce((p_checklist->>required_key)::boolean,false) is not true then
        raise exception 'Checklist penerima pengiriman belum lengkap';
      end if;
    end loop;
  end if;

  update public.fulfillments
  set final_verification_checklist = p_checklist,
      final_verified_at = now(),
      final_verified_by = auth.uid(),
      final_verification_note = nullif(btrim(coalesce(p_note,'')),''),
      updated_by = auth.uid(),
      updated_at = now()
  where id = result_row.id
  returning * into result_row;

  insert into public.fulfillment_status_history(
    fulfillment_id,from_status,to_status,note,changed_by,metadata
  ) values (
    result_row.id,'packing','packing','Pengecekan akhir fulfillment selesai',
    auth.uid(),jsonb_build_object(
      'event','fulfillment_final_verification_completed',
      'is_custom',is_custom,
      'payment_method',order_row.payment_method
    )
  );

  return result_row;
end;
$$;
