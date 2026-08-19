begin;

create or replace function public.refresh_order_fulfillment_status(p_order_id uuid)
returns public.orders
language plpgsql
security definer
set search_path=''
as $$
declare
  order_row public.orders;
  remaining_quantity bigint:=0;
  open_count integer:=0;
  completed_count integer:=0;
  preferred_method text;
  fulfillment_status text;
  next_status text;
begin
  select * into order_row from public.orders where id=p_order_id for update;
  if not found then raise exception 'Pesanan tidak ditemukan'; end if;

  if order_row.checkout_source='public_checkout' then
    select f.method,f.status into preferred_method,fulfillment_status
    from public.fulfillments f
    where f.order_id=p_order_id and f.archived_at is null and f.status<>'cancelled'
    order by f.created_at desc limit 1;
    if not found then return order_row; end if;

    next_status:=case
      when fulfillment_status='ready_for_pickup' then 'ready_for_pickup'
      when fulfillment_status in ('shipped','in_transit') then 'shipped'
      when fulfillment_status in ('delivered','picked_up') then 'completed'
      else 'processing'
    end;
    update public.orders set status=case when status in ('cancelled','expired','dibatalkan') then status else next_status end,
      updated_by=coalesce(auth.uid(),updated_by),updated_at=now()
    where id=p_order_id returning * into order_row;
    return order_row;
  end if;

  select coalesce(sum(greatest(source.passed_quantity-coalesce(delivery.delivered_quantity,0),0)),0)::bigint
  into remaining_quantity
  from (
    select wi.id,coalesce((select q.passed_quantity from public.qc_records q where q.work_item_id=wi.id and q.result='passed' and q.archived_at is null order by q.attempt_number desc limit 1),0)::bigint passed_quantity
    from public.work_items wi join public.job_orders jo on jo.id=wi.job_order_id
    where jo.order_id=p_order_id and jo.archived_at is null and wi.archived_at is null and wi.status='completed'
  ) source
  left join lateral (
    select coalesce(sum(fi.quantity),0)::bigint delivered_quantity
    from public.fulfillment_items fi join public.fulfillments f on f.id=fi.fulfillment_id
    where fi.work_item_id=source.id and f.status in ('delivered','picked_up')
  ) delivery on true;
  select count(*) into open_count from public.fulfillments where order_id=p_order_id and archived_at is null and status not in ('delivered','picked_up','cancelled');
  select count(*) into completed_count from public.fulfillments where order_id=p_order_id and status in ('delivered','picked_up');
  select method into preferred_method from public.fulfillments where order_id=p_order_id and archived_at is null and status<>'cancelled' order by created_at desc limit 1;
  preferred_method:=coalesce(preferred_method,order_row.delivery_method,'shipping');
  next_status:=case when remaining_quantity=0 and open_count=0 and completed_count>0 then 'selesai' when preferred_method='pickup' then 'siap_diambil' else 'siap_dikirim' end;
  update public.orders set status=case when status='dibatalkan' then status else next_status end,updated_by=coalesce(auth.uid(),updated_by),updated_at=now()
  where id=p_order_id returning * into order_row;
  return order_row;
end;
$$;

create or replace function public.create_ready_stock_fulfillment(p_order_id uuid)
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
begin
  if not public.has_permission('shipping.create') then raise exception 'Tidak berwenang membuat fulfillment'; end if;
  select * into order_row from public.orders where id=p_order_id and archived_at is null for update;
  if not found or order_row.checkout_source<>'public_checkout' or order_row.status in ('cancelled','expired','completed','dibatalkan','selesai') then raise exception 'Order Ready Stock aktif tidak ditemukan'; end if;
  if order_row.whatsapp_confirmed_at is null then raise exception 'WhatsApp belum diverifikasi'; end if;
  if order_row.delivery_method='shipping' and order_row.payment_status not in ('paid','terverifikasi') then raise exception 'Ready Stock kurir wajib lunas sebelum disiapkan untuk pengiriman'; end if;
  if order_row.delivery_method='pickup' and order_row.payment_method='bank_transfer' and order_row.payment_status not in ('paid','terverifikasi') then raise exception 'Pickup transfer wajib lunas sebelum dokumen fulfillment dibuat'; end if;
  if order_row.payment_status not in ('paid','terverifikasi') and not exists(select 1 from public.stock_reservations where order_id=p_order_id and status='active' and expires_at>now()) then raise exception 'Reservasi stok aktif tidak ditemukan'; end if;
  select * into result_row from public.fulfillments where order_id=p_order_id and archived_at is null and status<>'cancelled' order by created_at desc limit 1;
  if found then return result_row; end if;
  select nama_store,alamat into pickup_name,pickup_address from public.stores where id=order_row.pickup_location_id;
  number_value:=public.issue_document_number(case when order_row.delivery_method='pickup' then 'pickup_handover' else 'delivery' end,'fulfillment',result_id,'ready-stock-fulfillment:'||p_order_id::text,jsonb_build_object('order_id',p_order_id,'source','public_checkout'));
  insert into public.fulfillments(id,fulfillment_number,order_id,job_order_id,method,status,receiver_name,receiver_phone,destination,courier,package_count,notes,idempotency_key,created_by,updated_by)
  values(result_id,number_value,p_order_id,null,order_row.delivery_method,'preparing',order_row.customer_name,order_row.customer_phone,
    case when order_row.delivery_method='shipping' then order_row.shipping_address else coalesce(pickup_name||' — '||pickup_address,'Pickup Toko') end,
    case when order_row.delivery_method='shipping' then order_row.shipping_courier else null end,1,'Ready Stock dari Commerce Foundation V1','ready-stock:'||p_order_id::text,auth.uid(),auth.uid()) returning * into result_row;
  insert into public.fulfillment_items(fulfillment_id,work_item_id,order_item_id,quantity)
  select result_row.id,null,oi.id,oi.quantity from public.order_items oi where oi.order_id=p_order_id and oi.archived_at is null;
  if not found then raise exception 'Item order Ready Stock tidak ditemukan'; end if;
  insert into public.fulfillment_status_history(fulfillment_id,from_status,to_status,note,changed_by,metadata)
  values(result_row.id,null,'preparing','Dokumen fulfillment Ready Stock dibuat',auth.uid(),jsonb_build_object('order_id',p_order_id,'source','public_checkout'));
  update public.orders set status='processing',updated_by=auth.uid(),updated_at=now() where id=p_order_id;
  return result_row;
end;
$$;

create or replace function public.enforce_paid_ready_stock_handover()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare order_row public.orders;
begin
  if new.status is not distinct from old.status or new.status not in ('shipped','in_transit','delivered','picked_up') then return new; end if;
  select * into order_row from public.orders where id=new.order_id;
  if order_row.checkout_source='public_checkout' and order_row.payment_status not in ('paid','terverifikasi') then raise exception 'Ready Stock tidak boleh dikirim atau diserahkan sebelum lunas'; end if;
  return new;
end;
$$;

drop trigger if exists enforce_paid_ready_stock_handover_trigger on public.fulfillments;
create trigger enforce_paid_ready_stock_handover_trigger before update of status on public.fulfillments
for each row execute function public.enforce_paid_ready_stock_handover();

create or replace function public.complete_ready_stock_pickup_at_store(p_fulfillment_id uuid,p_admin_notes text default null)
returns public.fulfillments
language plpgsql
security definer
set search_path=''
as $$
declare fulfillment_row public.fulfillments; order_row public.orders; payment_row public.order_payments;
begin
  select * into fulfillment_row from public.fulfillments where id=p_fulfillment_id and archived_at is null and method='pickup' and status='ready_for_pickup' for update;
  if not found then raise exception 'Pickup belum siap diselesaikan'; end if;
  select * into order_row from public.orders where id=fulfillment_row.order_id and checkout_source='public_checkout' and payment_method='pay_at_store' for update;
  if not found then raise exception 'Order bayar di toko tidak ditemukan'; end if;
  if order_row.payment_status not in ('paid','terverifikasi') then
    if coalesce(order_row.payment_balance,0)<=0 then raise exception 'Sisa pembayaran tidak valid'; end if;
    select * into payment_row from public.create_order_payment(order_row.id,order_row.payment_balance,now(),'cash','Pickup Toko',null,null,coalesce(nullif(btrim(coalesce(p_admin_notes,'')),''),'Pembayaran penuh diterima saat pickup'),null,null,null,null,null);
    perform public.verify_order_payment(payment_row.id,'Diverifikasi atomik saat serah terima pickup');
  end if;
  select * into fulfillment_row from public.transition_fulfillment_status(p_fulfillment_id,'picked_up','Pembayaran dan pickup diselesaikan atomik',null);
  insert into public.system_audit_log(entity_type,entity_id,action,actor_id,actor_role,source,new_value)
  values('order',order_row.id,'pickup_paid_and_completed',auth.uid(),public.current_actor_role(),'commerce_foundation',jsonb_build_object('fulfillment_id',p_fulfillment_id));
  return fulfillment_row;
end;
$$;

revoke all on function public.create_ready_stock_fulfillment(uuid) from public,anon;
revoke all on function public.complete_ready_stock_pickup_at_store(uuid,text) from public,anon;
grant execute on function public.create_ready_stock_fulfillment(uuid) to authenticated,service_role;
grant execute on function public.complete_ready_stock_pickup_at_store(uuid,text) to authenticated,service_role;

commit;

-- Recovery: revoke the two bridge RPCs and remove the guard trigger while
-- retaining fulfillment/payment/order history. Re-apply the prior refresh
-- function only while operational traffic is stopped.
