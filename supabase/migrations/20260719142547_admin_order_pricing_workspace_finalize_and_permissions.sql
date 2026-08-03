create or replace function public.finalize_custom_order_pricing_v1(
  p_order_id uuid,
  p_expected_updated_at timestamptz,
  p_expected_draft_version integer,
  p_idempotency_key text
)
returns public.custom_order_quotation_versions
language plpgsql
security definer
set search_path=''
as $$
declare
  order_row public.orders;
  result_row public.custom_order_quotation_versions;
  validated_draft jsonb;
  customer_components jsonb;
  next_version integer;
  previous_total bigint;
  final_total bigint;
  shipping_total bigint;
  subtotal_total bigint;
  design_snapshot jsonb;
  normalized_key text:=nullif(left(btrim(coalesce(p_idempotency_key,'')),160),'');
begin
  if not public.has_permission('order.edit') then raise exception 'Tidak berwenang memfinalisasi harga'; end if;
  if normalized_key is null or length(normalized_key)<16 then raise exception 'Kunci idempotensi tidak valid'; end if;

  select * into result_row from public.custom_order_quotation_versions
  where order_id=p_order_id and finalization_key=normalized_key;
  if found then return result_row; end if;

  select * into order_row from public.orders where id=p_order_id and archived_at is null for update;
  if not found then raise exception 'Order aktif tidak ditemukan'; end if;
  select * into result_row from public.custom_order_quotation_versions
  where order_id=p_order_id and finalization_key=normalized_key;
  if found then return result_row; end if;

  if order_row.status<>'under_review' or order_row.custom_review_completed_at is null then raise exception 'Tahap server bukan Penetapan Harga'; end if;
  if order_row.custom_quote_status in ('sent','locked') then raise exception 'Penawaran aktif sudah dikirim atau dikunci'; end if;
  if order_row.whatsapp_confirmed_at is null then raise exception 'Pelanggan belum diverifikasi'; end if;
  if order_row.updated_at is distinct from p_expected_updated_at then raise exception 'Order telah diperbarui oleh admin lain'; end if;
  if order_row.custom_pricing_draft_version is distinct from p_expected_draft_version then raise exception 'Versi draft telah diperbarui oleh admin lain'; end if;
  if order_row.custom_pricing_draft is null then raise exception 'Draft harga belum disimpan'; end if;

  validated_draft:=public.build_custom_order_pricing_v1(
    p_order_id,
    order_row.custom_pricing_draft->'editable_lines',
    order_row.custom_pricing_draft->'confirmations',
    (order_row.custom_pricing_draft->>'valid_days')::integer,
    order_row.custom_pricing_draft->>'customer_note',
    order_row.custom_pricing_draft->>'internal_note'
  );
  if jsonb_array_length(validated_draft->'blockers')>0 then raise exception 'Pricing server validation failed'; end if;
  final_total:=(validated_draft#>>'{totals,final}')::bigint;
  shipping_total:=(validated_draft#>>'{totals,shipping}')::bigint;
  subtotal_total:=final_total-shipping_total;
  if final_total<=0 or subtotal_total<0 then raise exception 'Total final tidak valid'; end if;

  select coalesce(max(version_number),0)+1,max(quoted_total) filter(where status in ('locked','sent'))
  into next_version,previous_total
  from public.custom_order_quotation_versions where order_id=p_order_id;
  update public.custom_order_quotation_versions set status='superseded'
  where order_id=p_order_id and status='sent';
  select coalesce(jsonb_agg(jsonb_build_object('upload_id',id,'design_version',design_version,'design_stage',design_stage) order by design_version),'[]'::jsonb)
  into design_snapshot from public.customer_uploads where linked_order_id=p_order_id and status='linked';

  customer_components:=(validated_draft-'internal_note'-'blockers')||jsonb_build_object('finalized_at',now());
  insert into public.custom_order_quotation_versions(
    order_id,version_number,status,previous_total,quoted_total,pricing_components,
    review_checklist,design_version_snapshot,valid_until,sent_by,finalization_key
  ) values(
    p_order_id,next_version,'sent',previous_total,final_total,customer_components,
    validated_draft->'confirmations',design_snapshot,
    now()+make_interval(days=>(validated_draft->>'valid_days')::integer),auth.uid(),normalized_key
  ) returning * into result_row;

  update public.orders set
    custom_pricing_draft=validated_draft,
    pricing_status='final',subtotal_amount=subtotal_total,total_amount=final_total,
    shipping_cost=case when shipping_total>0 then shipping_total else null end,
    custom_quote_version=next_version,custom_quote_status='sent',custom_quote_locked_at=null,
    custom_quote_locked_total=null,final_total_approved_at=null,status='awaiting_customer_approval',
    payment_required_amount=0,payment_balance=0,updated_by=auth.uid(),updated_at=now()
  where id=p_order_id;

  insert into public.order_status_history(order_id,from_status,to_status,note,changed_by)
  values(p_order_id,order_row.status,'awaiting_customer_approval','Harga final dan penawaran Custom versi '||next_version||' disiapkan untuk pelanggan.',auth.uid());
  insert into public.system_audit_log(entity_type,entity_id,action,actor_id,actor_role,source,old_value,new_value)
  values(
    'order',p_order_id,'custom_quotation_finalized_and_sent',auth.uid(),public.current_actor_role(),'admin_order_pricing_workspace',
    jsonb_build_object('status',order_row.status,'pricing_status',order_row.pricing_status,'total',order_row.total_amount,'draft_version',order_row.custom_pricing_draft_version),
    jsonb_build_object('status','awaiting_customer_approval','pricing_status','final','total',final_total,'quotation_id',result_row.id,'quotation_version',next_version,'draft_version',order_row.custom_pricing_draft_version)
  );
  return result_row;
end $$;

create or replace function public.send_custom_order_quotation_v1(
  p_order_id uuid,p_checklist jsonb,p_valid_days integer,p_expected_updated_at timestamptz
)
returns public.custom_order_quotation_versions
language plpgsql
security definer
set search_path=''
as $$
begin
  raise exception 'Gunakan workspace Penetapan Harga dan finalisasi draft server';
end $$;

revoke all on function public.build_custom_order_pricing_v1(uuid,jsonb,jsonb,integer,text,text) from public,anon,authenticated;
revoke all on function public.approve_custom_order_review_v1(uuid,jsonb,text,timestamptz) from public,anon,authenticated;
revoke all on function public.save_custom_order_pricing_draft_v1(uuid,jsonb,jsonb,integer,text,text,timestamptz,integer) from public,anon;
revoke all on function public.finalize_custom_order_pricing_v1(uuid,timestamptz,integer,text) from public,anon;
revoke all on function public.send_custom_order_quotation_v1(uuid,jsonb,integer,timestamptz) from public,anon,authenticated;
grant execute on function public.approve_custom_order_review_v1(uuid,jsonb,text,timestamptz) to authenticated,service_role;
grant execute on function public.save_custom_order_pricing_draft_v1(uuid,jsonb,jsonb,integer,text,text,timestamptz,integer) to authenticated,service_role;
grant execute on function public.finalize_custom_order_pricing_v1(uuid,timestamptz,integer,text) to authenticated,service_role;
grant execute on function public.send_custom_order_quotation_v1(uuid,jsonb,integer,timestamptz) to authenticated,service_role;;
