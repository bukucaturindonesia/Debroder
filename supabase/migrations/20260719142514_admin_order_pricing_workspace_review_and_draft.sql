create or replace function public.approve_custom_order_review_v1(
  p_order_id uuid,p_checklist jsonb,p_note text,p_expected_updated_at timestamptz
)
returns public.orders
language plpgsql
security definer
set search_path=''
as $$
declare result_row public.orders;
begin
  if not public.has_permission('order.edit') then raise exception 'Tidak berwenang menyetujui review'; end if;
  select * into result_row from public.orders where id=p_order_id and archived_at is null for update;
  if not found or result_row.custom_review_started_at is null then raise exception 'Mulai review terlebih dahulu'; end if;
  if result_row.status in ('cancelled','dibatalkan','completed','selesai') then raise exception 'Tahap order tidak dapat direview'; end if;
  if result_row.updated_at is distinct from p_expected_updated_at then raise exception 'Order telah diperbarui oleh admin lain'; end if;
  if jsonb_typeof(p_checklist)<>'object'
     or coalesce(p_checklist->'product','false'::jsonb)<>'true'::jsonb
     or coalesce(p_checklist->'service','false'::jsonb)<>'true'::jsonb then
    raise exception 'Dua konfirmasi operasional belum lengkap';
  end if;
  update public.orders set
    custom_review_completed_at=now(),custom_reviewed_by=auth.uid(),status='under_review',
    updated_by=auth.uid(),updated_at=now()
  where id=p_order_id returning * into result_row;
  insert into public.system_audit_log(entity_type,entity_id,action,actor_id,actor_role,source,reason,new_value)
  values('order',p_order_id,'custom_order_review_approved',auth.uid(),public.current_actor_role(),'admin_order_pricing_workspace',nullif(left(btrim(coalesce(p_note,'')),1000),''),p_checklist);
  return result_row;
end $$;

create or replace function public.save_custom_order_pricing_draft_v1(
  p_order_id uuid,
  p_editable_lines jsonb,
  p_confirmations jsonb,
  p_valid_days integer,
  p_customer_note text,
  p_internal_note text,
  p_expected_updated_at timestamptz,
  p_expected_draft_version integer
)
returns public.orders
language plpgsql
security definer
set search_path=''
as $$
declare order_row public.orders; result_row public.orders; next_draft jsonb;
begin
  if not public.has_permission('order.edit') then raise exception 'Tidak berwenang menyimpan draft harga'; end if;
  select * into order_row from public.orders where id=p_order_id and archived_at is null for update;
  if not found then raise exception 'Order aktif tidak ditemukan'; end if;
  if order_row.status in ('cancelled','dibatalkan','completed','selesai') then raise exception 'Tahap order tidak dapat menetapkan harga'; end if;
  if order_row.status<>'under_review' or order_row.custom_review_completed_at is null then raise exception 'Tahap server bukan Penetapan Harga'; end if;
  if order_row.custom_quote_status in ('sent','locked') then raise exception 'Penawaran aktif tidak boleh ditimpa oleh draft'; end if;
  if order_row.updated_at is distinct from p_expected_updated_at then raise exception 'Order telah diperbarui oleh admin lain'; end if;
  if order_row.custom_pricing_draft_version is distinct from coalesce(p_expected_draft_version,0) then raise exception 'Versi draft telah diperbarui oleh admin lain'; end if;

  next_draft:=public.build_custom_order_pricing_v1(p_order_id,p_editable_lines,p_confirmations,p_valid_days,p_customer_note,p_internal_note);
  update public.orders set
    custom_pricing_draft=next_draft,
    custom_pricing_draft_version=custom_pricing_draft_version+1,
    custom_pricing_draft_updated_at=now(),custom_pricing_draft_updated_by=auth.uid(),
    custom_quote_status='draft',updated_by=auth.uid(),updated_at=now()
  where id=p_order_id returning * into result_row;

  insert into public.system_audit_log(entity_type,entity_id,action,actor_id,actor_role,source,old_value,new_value)
  values(
    'order',p_order_id,case when order_row.custom_pricing_draft_version=0 then 'custom_pricing_draft_created' else 'custom_pricing_draft_saved' end,auth.uid(),public.current_actor_role(),'admin_order_pricing_workspace',
    jsonb_build_object('draft_version',order_row.custom_pricing_draft_version,'line_count',jsonb_array_length(coalesce(order_row.custom_pricing_draft->'editable_lines','[]'::jsonb)),'totals',order_row.custom_pricing_draft->'totals'),
    jsonb_build_object(
      'draft_version',result_row.custom_pricing_draft_version,
      'line_count',jsonb_array_length(next_draft->'editable_lines'),
      'totals',next_draft->'totals',
      'blocker_count',jsonb_array_length(next_draft->'blockers'),
      'line_added',jsonb_array_length(next_draft->'editable_lines')>jsonb_array_length(coalesce(order_row.custom_pricing_draft->'editable_lines','[]'::jsonb)),
      'line_removed',jsonb_array_length(next_draft->'editable_lines')<jsonb_array_length(coalesce(order_row.custom_pricing_draft->'editable_lines','[]'::jsonb)),
      'line_changed',coalesce(order_row.custom_pricing_draft->'editable_lines','[]'::jsonb) is distinct from next_draft->'editable_lines',
      'adjustment_reasons',(
        select coalesce(jsonb_agg(value->>'reason'),'[]'::jsonb)
        from jsonb_array_elements(next_draft->'editable_lines')
        where value->>'kind' in ('ADJUSTMENT','DISCOUNT') and coalesce(value->>'reason','')<>''
      )
    )
  );
  return result_row;
end $$;;
