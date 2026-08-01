-- The Pay at Store pickup resolver introduced four operational task types in
-- 20260801115245, but the existing task ledger constraint still rejected them.
-- Keep the ledger vocabulary, SLA ownership, and lifecycle cleanup aligned.
alter table public.order_tasks
  drop constraint if exists order_tasks_task_type_check;

alter table public.order_tasks
  add constraint order_tasks_task_type_check check(task_type in (
    'review_new_order','review_custom_order','set_shipping_quote','prepare_custom_quote',
    'review_payment','resolve_payment_correction','create_job_order','prepare_ready_stock',
    'run_production','run_quality_control','pack_order','run_final_check','dispatch_shipping',
    'handover_pickup','confirm_customer_arrival','record_pay_at_store_payment',
    'record_pickup_handover','complete_pickup_order','resolve_integrity','stock_transfer',
    'pickup_prepare','pickup_extension_review','pickup_no_show','cancellation_review',
    'refund_process','customer_contact','shipping_exception','outbox_failure','health_reconcile'
  ));

insert into public.order_task_sla_policies(
  task_type,duration_minutes,warning_minutes,escalation_role
)
values
  ('confirm_customer_arrival',4320,720,'store_staff'),
  ('record_pay_at_store_payment',30,10,'store_staff'),
  ('record_pickup_handover',120,30,'store_staff'),
  ('complete_pickup_order',30,10,'store_staff')
on conflict(task_type) do update
set duration_minutes=excluded.duration_minutes,
    warning_minutes=excluded.warning_minutes,
    escalation_role=excluded.escalation_role,
    active=true,
    updated_at=now();

create or replace function public.sync_order_operational_task_v1(
  p_order_id uuid,
  p_source_event_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path=''
as $$
declare
  stage jsonb;
  key_value text;
  type_value text;
  task_id_value uuid;
  terminal_value boolean;
  priority_value text := 'normal';
begin
  perform public.refresh_order_integrity_v1(p_order_id);
  stage := public._resolve_order_active_stage_v1(p_order_id);
  key_value := nullif(stage->>'taskKey','');
  type_value := nullif(stage->>'adminTaskType','');
  terminal_value := coalesce((stage->>'isTerminal')::boolean,false);

  if stage->>'activeStage' in ('payment_review','integrity_review')
     or stage->>'warning' is not null then
    priority_value := 'high';
  end if;

  update public.order_tasks
  set status = case when terminal_value then 'cancelled' else 'resolved' end,
      resolved_at = now(),
      resolved_by = auth.uid(),
      resolution = case
        when terminal_value then 'Order terminal; tugas lifecycle ditutup otomatis.'
        else 'Tahap canonical telah berubah.'
      end,
      updated_at = now(),
      updated_by = auth.uid()
  where order_id=p_order_id
    and archived_at is null
    and status in ('open','acknowledged','in_progress','blocked')
    and task_type in (
      'review_new_order','review_custom_order','set_shipping_quote','prepare_custom_quote',
      'review_payment','resolve_payment_correction','create_job_order','prepare_ready_stock',
      'run_production','run_quality_control','pack_order','run_final_check',
      'dispatch_shipping','handover_pickup','confirm_customer_arrival',
      'record_pay_at_store_payment','record_pickup_handover','complete_pickup_order',
      'resolve_integrity'
    )
    and (key_value is null or task_key<>key_value);

  if key_value is null or type_value is null then return null; end if;

  insert into public.order_tasks(
    task_key,order_id,task_type,status,priority,assigned_role,source_event_id,
    title,description,related_path,stage_snapshot,created_at,updated_at
  ) values (
    key_value,p_order_id,type_value,'open',priority_value,
    case type_value
      when 'review_new_order' then 'sales_admin'
      when 'review_custom_order' then 'sales_admin'
      when 'set_shipping_quote' then 'sales_admin'
      when 'prepare_custom_quote' then 'sales_admin'
      when 'review_payment' then 'finance'
      when 'resolve_payment_correction' then 'finance'
      when 'create_job_order' then 'production_admin'
      when 'run_production' then 'production_admin'
      when 'run_quality_control' then 'quality_control'
      when 'prepare_ready_stock' then 'store_staff'
      when 'pack_order' then 'store_staff'
      when 'run_final_check' then 'store_staff'
      when 'dispatch_shipping' then 'store_staff'
      when 'handover_pickup' then 'store_staff'
      when 'confirm_customer_arrival' then 'store_staff'
      when 'record_pay_at_store_payment' then 'store_staff'
      when 'record_pickup_handover' then 'store_staff'
      when 'complete_pickup_order' then 'store_staff'
      else 'admin'
    end,
    p_source_event_id,
    stage->>'adminStatusLabel',
    coalesce(stage->>'blockingReason','Tindak lanjuti tahap aktif pesanan.'),
    format('/admin/orders/%s',p_order_id),
    stage,now(),now()
  )
  on conflict(task_key) do update
  set status=case
        when public.order_tasks.status in ('resolved','cancelled') then 'open'
        else public.order_tasks.status
      end,
      priority=excluded.priority,
      assigned_role=excluded.assigned_role,
      source_event_id=coalesce(excluded.source_event_id,public.order_tasks.source_event_id),
      title=excluded.title,
      description=excluded.description,
      related_path=excluded.related_path,
      stage_snapshot=excluded.stage_snapshot,
      resolved_at=case
        when public.order_tasks.status in ('resolved','cancelled') then null
        else public.order_tasks.resolved_at
      end,
      resolved_by=case
        when public.order_tasks.status in ('resolved','cancelled') then null
        else public.order_tasks.resolved_by
      end,
      resolution=case
        when public.order_tasks.status in ('resolved','cancelled') then null
        else public.order_tasks.resolution
      end,
      updated_at=now()
  returning id into task_id_value;

  return task_id_value;
end
$$;

revoke all on function public.sync_order_operational_task_v1(uuid,uuid)
  from public,anon,authenticated;
grant execute on function public.sync_order_operational_task_v1(uuid,uuid)
  to service_role;
