begin;

-- DEBRODER Human-Centered Operational Experience P0
-- Mesin bisnis tetap dipertahankan. Migration ini mengotomatiskan handoff
-- Ready Stock ke fulfillment supaya Admin tidak membuat dokumen internal manual.

create or replace function public._ensure_ready_stock_fulfillment_v2(
  p_order_id uuid,
  p_source text default 'system'
)
returns public.fulfillments
language plpgsql
security definer
set search_path=''
as $$
declare
  order_row public.orders;
  result_row public.fulfillments;
  result_id uuid:=gen_random_uuid();
  number_value text;
  pickup_name text;
  pickup_address text;
  actor_id uuid:=auth.uid();
begin
  if p_order_id is null then return null; end if;

  select * into order_row
  from public.orders
  where id=p_order_id and archived_at is null
  for update;

  if not found
     or order_row.checkout_source<>'public_checkout'
     or order_row.status in ('cancelled','expired','completed','dibatalkan','selesai')
     or jsonb_typeof(coalesce(order_row.custom_project_snapshot,'[]'::jsonb))<>'array'
     or jsonb_array_length(coalesce(order_row.custom_project_snapshot,'[]'::jsonb))>0 then
    return null;
  end if;

  -- Permintaan pembatalan aktif selalu menghentikan handoff baru. Mesin refund
  -- dan pembatalan Phase 4–13 tetap menjadi sumber kebenaran pengecualian.
  if exists(
    select 1
    from public.order_cancellation_requests request
    where request.order_id=p_order_id
      and request.status in ('pending','approved','approved_refund_required')
  ) then return null; end if;

  select * into result_row
  from public.fulfillments
  where order_id=p_order_id
    and archived_at is null
    and status<>'cancelled'
  order by created_at desc
  limit 1;
  if found then return result_row; end if;

  -- Jangan membuat dokumen kosong sebelum item checkout selesai disimpan.
  if not exists(
    select 1 from public.order_items oi
    where oi.order_id=p_order_id and oi.archived_at is null
  ) then return null; end if;

  if order_row.whatsapp_confirmed_at is null then return null; end if;

  if order_row.delivery_method='shipping' then
    if order_row.payment_status not in ('paid','terverifikasi') then return null; end if;
    if btrim(coalesce(order_row.shipping_address,''))='' then return null; end if;
  elsif order_row.delivery_method='pickup' then
    if order_row.payment_method='bank_transfer'
       and order_row.payment_status not in ('paid','terverifikasi') then
      return null;
    end if;
    if order_row.payment_status not in ('paid','terverifikasi')
       and not exists(
         select 1 from public.stock_reservations sr
         where sr.order_id=p_order_id
           and sr.status='active'
           and sr.expires_at>now()
       ) then
      return null;
    end if;
  else
    return null;
  end if;

  select nama_store,alamat into pickup_name,pickup_address
  from public.stores
  where id=order_row.pickup_location_id;

  number_value:=public.issue_document_number(
    case when order_row.delivery_method='pickup' then 'pickup_handover' else 'delivery' end,
    'fulfillment',
    result_id,
    'ready-stock-fulfillment:'||p_order_id::text,
    jsonb_build_object(
      'order_id',p_order_id,
      'source','public_checkout',
      'creation','automatic'
    )
  );

  insert into public.fulfillments(
    id,fulfillment_number,order_id,job_order_id,method,status,
    receiver_name,receiver_phone,destination,courier,package_count,notes,
    idempotency_key,created_by,updated_by
  ) values(
    result_id,
    number_value,
    p_order_id,
    null,
    order_row.delivery_method,
    'preparing',
    order_row.customer_name,
    order_row.customer_phone,
    case
      when order_row.delivery_method='shipping' then order_row.shipping_address
      else coalesce(nullif(btrim(coalesce(pickup_name,'')),''), 'Pickup Toko')
           || case when nullif(btrim(coalesce(pickup_address,'')),'') is null then '' else ' — '||pickup_address end
    end,
    case when order_row.delivery_method='shipping' then order_row.shipping_courier else null end,
    1,
    'Ready Stock dibuat otomatis setelah seluruh syarat terpenuhi',
    'ready-stock:'||p_order_id::text,
    actor_id,
    actor_id
  ) returning * into result_row;

  insert into public.fulfillment_items(fulfillment_id,work_item_id,order_item_id,quantity)
  select result_row.id,null,oi.id,oi.quantity
  from public.order_items oi
  where oi.order_id=p_order_id and oi.archived_at is null;

  if not found then raise exception 'Item order Ready Stock tidak ditemukan'; end if;

  insert into public.fulfillment_status_history(
    fulfillment_id,from_status,to_status,note,changed_by,metadata
  ) values(
    result_row.id,
    null,
    'preparing',
    'Nomor pengiriman internal dibuat otomatis oleh sistem',
    actor_id,
    jsonb_build_object(
      'order_id',p_order_id,
      'source',coalesce(nullif(btrim(p_source),''),'system'),
      'automatic',true,
      'phase','human_centered_p0'
    )
  );

  update public.orders
  set status=case
        when status in ('cancelled','expired','completed','dibatalkan','selesai') then status
        else 'processing'
      end,
      updated_by=coalesce(actor_id,updated_by),
      updated_at=now()
  where id=p_order_id;

  insert into public.system_audit_log(
    entity_type,entity_id,action,actor_id,actor_role,source,new_value
  ) values(
    'order',p_order_id,'ready_stock_fulfillment_auto_created',actor_id,
    coalesce(public.current_actor_role(),'system'),
    'human_centered_order_experience',
    jsonb_build_object(
      'fulfillment_id',result_row.id,
      'fulfillment_number',result_row.fulfillment_number,
      'method',result_row.method,
      'trigger_source',coalesce(nullif(btrim(p_source),''),'system')
    )
  );

  return result_row;
exception
  when unique_violation then
    select * into result_row
    from public.fulfillments
    where idempotency_key='ready-stock:'||p_order_id::text
    limit 1;
    if found then return result_row; end if;
    raise;
end;
$$;

-- Pertahankan RPC lama sebagai compatibility wrapper, tetapi UI tidak lagi
-- meminta Admin membuat dokumen secara manual.
create or replace function public.create_ready_stock_fulfillment(p_order_id uuid)
returns public.fulfillments
language plpgsql
security definer
set search_path=''
as $$
declare
  result_row public.fulfillments;
begin
  if not public.has_permission('shipping.create') then
    raise exception 'Tidak berwenang mengelola pengiriman atau pickup';
  end if;
  result_row:=public._ensure_ready_stock_fulfillment_v2(p_order_id,'compatibility_rpc');
  if result_row.id is null then
    raise exception 'Dokumen belum dapat dibuat karena syarat konfirmasi, pembayaran, reservasi, alamat, atau item belum lengkap';
  end if;
  return result_row;
end;
$$;

create or replace function public.trigger_ensure_ready_stock_fulfillment_v2()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  target_order_id uuid;
begin
  target_order_id:=case
    when tg_table_name='orders' then new.id
    else new.order_id
  end;
  perform public._ensure_ready_stock_fulfillment_v2(
    target_order_id,
    'trigger:'||tg_table_name||':'||lower(tg_op)
  );
  return new;
end;
$$;

-- Deployment aman saat diulang: policy/function lama tidak dihapus dan trigger
-- dibuat ulang secara eksplisit.
drop trigger if exists ensure_ready_stock_fulfillment_order_insert on public.orders;
create trigger ensure_ready_stock_fulfillment_order_insert
after insert on public.orders
for each row execute function public.trigger_ensure_ready_stock_fulfillment_v2();

drop trigger if exists ensure_ready_stock_fulfillment_order_update on public.orders;
create trigger ensure_ready_stock_fulfillment_order_update
after update of status,payment_status,payment_requirement_met,payment_production_eligible,
  whatsapp_confirmed_at,delivery_method,payment_method,shipping_address,shipping_courier,
  pickup_location_id,archived_at
on public.orders
for each row execute function public.trigger_ensure_ready_stock_fulfillment_v2();

drop trigger if exists ensure_ready_stock_fulfillment_item_insert on public.order_items;
create trigger ensure_ready_stock_fulfillment_item_insert
after insert on public.order_items
for each row execute function public.trigger_ensure_ready_stock_fulfillment_v2();

drop trigger if exists ensure_ready_stock_fulfillment_item_update on public.order_items;
create trigger ensure_ready_stock_fulfillment_item_update
after update of quantity,archived_at on public.order_items
for each row execute function public.trigger_ensure_ready_stock_fulfillment_v2();

drop trigger if exists ensure_ready_stock_fulfillment_reservation_insert on public.stock_reservations;
create trigger ensure_ready_stock_fulfillment_reservation_insert
after insert on public.stock_reservations
for each row execute function public.trigger_ensure_ready_stock_fulfillment_v2();

drop trigger if exists ensure_ready_stock_fulfillment_reservation_update on public.stock_reservations;
create trigger ensure_ready_stock_fulfillment_reservation_update
after update of status,expires_at on public.stock_reservations
for each row execute function public.trigger_ensure_ready_stock_fulfillment_v2();

-- Backfill aman untuk UAT/Preview: hanya Ready Stock aktif yang sudah memenuhi
-- syarat. Helper tetap idempotent, mengabaikan Custom, terminal, dan pembatalan aktif.
do $$
declare
  candidate_id uuid;
begin
  for candidate_id in
    select o.id
    from public.orders o
    where o.archived_at is null
      and o.checkout_source='public_checkout'
      and o.status not in ('cancelled','expired','completed','dibatalkan','selesai')
      and jsonb_typeof(coalesce(o.custom_project_snapshot,'[]'::jsonb))='array'
      and jsonb_array_length(coalesce(o.custom_project_snapshot,'[]'::jsonb))=0
    order by o.created_at
  loop
    perform public._ensure_ready_stock_fulfillment_v2(candidate_id,'migration_backfill');
  end loop;
end;
$$;

revoke all on function public._ensure_ready_stock_fulfillment_v2(uuid,text) from public,anon,authenticated;
revoke all on function public.trigger_ensure_ready_stock_fulfillment_v2() from public,anon,authenticated;
revoke all on function public.create_ready_stock_fulfillment(uuid) from public,anon;
grant execute on function public._ensure_ready_stock_fulfillment_v2(uuid,text) to service_role;
grant execute on function public.create_ready_stock_fulfillment(uuid) to authenticated,service_role;

commit;
