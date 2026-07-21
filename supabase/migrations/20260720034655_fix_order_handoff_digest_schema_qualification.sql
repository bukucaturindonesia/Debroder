-- DEBRODER WhatsApp verification / order handoff digest schema fix
-- Already applied to Supabase production.
-- Qualifies pgcrypto digest calls for SECURITY DEFINER functions with an empty search_path.

create or replace function public.sync_order_handoff_v2(
  p_order_id uuid,
  p_source_event_id uuid default null::uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  stage jsonb;
  previous public.order_handoff_state;
  key_value text;
  event_type_value text;
  task_id_value uuid;
begin
  task_id_value := public.sync_order_operational_task_v1(p_order_id,p_source_event_id);
  stage := public._resolve_order_active_stage_v1(p_order_id);
  key_value := concat_ws(':',
    coalesce(stage->>'activeStage','unknown'),
    coalesce(stage->>'taskKey','none'),
    coalesce(stage->>'customerStatusLabel','status')
  );

  select * into previous
  from public.order_handoff_state
  where order_id = p_order_id
  for update;

  if not found then
    insert into public.order_handoff_state(order_id,stage_key,stage_snapshot,last_synced_at)
    values(p_order_id,key_value,stage,now());
  elsif previous.stage_key is distinct from key_value then
    update public.order_handoff_state
    set stage_key = key_value,
        stage_snapshot = stage,
        last_synced_at = now()
    where order_id = p_order_id;

    event_type_value := public.customer_event_type_for_stage_v1(stage);
    perform public.enqueue_customer_notification_v1(
      p_order_id,
      event_type_value,
      format(
        'order:%s:stage:%s',
        p_order_id,
        encode(extensions.digest(key_value,'sha256'),'hex')
      ),
      jsonb_build_object('stage',stage)
    );
  else
    update public.order_handoff_state
    set stage_snapshot = stage,
        last_synced_at = now()
    where order_id = p_order_id;
  end if;

  return jsonb_build_object(
    'stage',stage,
    'task_id',task_id_value,
    'stage_key',key_value
  );
end;
$$;

create or replace function public.request_order_cancellation_for_order_v1(
  p_order_id uuid,
  p_reason text
)
returns public.order_cancellation_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  o public.orders;
  row_value public.order_cancellation_requests;
  verified_value bigint;
  key_value text;
begin
  if length(btrim(coalesce(p_reason,''))) < 5 then
    raise exception 'Alasan pembatalan wajib diisi';
  end if;

  select * into o
  from public.orders
  where id = p_order_id and archived_at is null
  for update;

  if not found then raise exception 'Pesanan tidak ditemukan'; end if;
  if o.status in ('cancelled','dibatalkan','expired','completed','selesai','picked_up') then
    raise exception 'Pesanan terminal tidak dapat dibatalkan';
  end if;

  select * into row_value
  from public.order_cancellation_requests
  where order_id = p_order_id
    and status in ('pending','approved','approved_refund_required')
  order by created_at desc
  limit 1;

  if found then return row_value; end if;

  verified_value := public.order_verified_funds_v1(p_order_id);
  key_value := format(
    'cancel:%s:%s:%s',
    p_order_id,
    encode(extensions.digest(btrim(p_reason),'sha256'),'hex'),
    extract(epoch from clock_timestamp())::bigint
  );

  insert into public.order_cancellation_requests(
    order_id,request_key,reason,status,requires_refund,verified_amount_snapshot
  ) values(
    p_order_id,key_value,btrim(p_reason),'pending',verified_value > 0,verified_value
  ) returning * into row_value;

  insert into public.order_tasks(
    task_key,order_id,task_type,status,priority,assigned_role,
    title,description,related_path,stage_snapshot
  ) values(
    format('order:%s:cancellation_review:%s',p_order_id,row_value.id),
    p_order_id,'cancellation_review','open','high','admin',
    'Periksa Permintaan Pembatalan',btrim(p_reason),
    format('/admin/refunds?order=%s',p_order_id),
    jsonb_build_object(
      'cancellation_request_id',row_value.id,
      'verified_amount',verified_value
    )
  ) on conflict(task_key) do nothing;

  perform public.enqueue_customer_notification_v1(
    p_order_id,
    'cancellation_requested',
    format('order:%s:cancellation:%s',p_order_id,row_value.id),
    jsonb_build_object('request_id',row_value.id)
  );

  return row_value;
end;
$$;
