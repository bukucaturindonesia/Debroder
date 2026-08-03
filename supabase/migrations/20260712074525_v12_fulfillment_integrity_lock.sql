create or replace function public.update_fulfillment_draft(p_fulfillment_id uuid,p_receiver_name text,p_receiver_phone text,p_destination text,p_courier text,p_package_count integer,p_scheduled_at timestamptz,p_notes text)
returns public.fulfillments language plpgsql security definer set search_path=public as $$
declare r public.fulfillments; begin
 if not public.has_permission('shipping.update') then raise exception 'Not authorized'; end if;
 if coalesce(p_package_count,0)<=0 then raise exception 'Invalid package count'; end if;
 update public.fulfillments set receiver_name=nullif(btrim(coalesce(p_receiver_name,'')),''),receiver_phone=nullif(btrim(coalesce(p_receiver_phone,'')),''),destination=nullif(btrim(coalesce(p_destination,'')),''),courier=nullif(btrim(coalesce(p_courier,'')),''),package_count=p_package_count,scheduled_at=p_scheduled_at,notes=nullif(btrim(coalesce(p_notes,'')),''),updated_by=auth.uid(),updated_at=now()
 where id=p_fulfillment_id and archived_at is null and status in ('preparing','packing','ready_to_ship','ready_for_pickup') returning * into r;
 if not found then raise exception 'Editable fulfillment not found'; end if; return r; end $$;

create or replace function public.refresh_order_fulfillment_status(p_order_id uuid)
returns public.orders language plpgsql security definer set search_path=public as $$
declare o public.orders; remaining bigint; open_count integer; begin
 select coalesce(sum(greatest(w.quantity-coalesce(x.fulfilled,0),0)),0)::bigint into remaining
 from public.work_items w join public.job_orders j on j.id=w.job_order_id
 left join lateral (select sum(fi.quantity)::bigint fulfilled from public.fulfillment_items fi join public.fulfillments f on f.id=fi.fulfillment_id where fi.work_item_id=w.id and f.archived_at is null and f.status in ('delivered','picked_up')) x on true
 where j.order_id=p_order_id and j.archived_at is null and w.archived_at is null and w.status='completed';
 select count(*) into open_count from public.fulfillments where order_id=p_order_id and archived_at is null and status not in ('delivered','picked_up','cancelled');
 update public.orders set status=case when remaining=0 and open_count=0 and exists(select 1 from public.fulfillments where order_id=p_order_id and archived_at is null and status in ('delivered','picked_up')) then 'selesai' when status='selesai' then 'diproses' else status end,updated_at=now(),updated_by=coalesce(auth.uid(),updated_by)
 where id=p_order_id returning * into o; return o; end $$;

create or replace function public.create_fulfillment(p_order_id uuid,p_method text,p_receiver_name text,p_receiver_phone text,p_destination text,p_courier text,p_package_count integer,p_scheduled_at timestamptz,p_notes text,p_items jsonb)
returns public.fulfillments language plpgsql security definer set search_path=public as $$
declare o public.orders; jo public.job_orders; f public.fulfillments; item jsonb; wi public.work_items; n text; qty int; issued_type text; begin
 if not public.has_permission('shipping.create') then raise exception 'Not authorized'; end if;
 if p_method not in ('shipping','pickup') then raise exception 'Invalid method'; end if;
 select * into o from public.orders where id=p_order_id and archived_at is null and status<>'dibatalkan' for update;
 if not found then raise exception 'Active order not found'; end if;
 select * into jo from public.job_orders where order_id=o.id and archived_at is null and status in ('released','in_progress','completed') order by created_at desc limit 1;
 if not found then raise exception 'Released Job Order required'; end if;
 if jsonb_typeof(coalesce(p_items,'[]'::jsonb))<>'array' or jsonb_array_length(coalesce(p_items,'[]'::jsonb))=0 then raise exception 'Fulfillment items required'; end if;
 insert into public.fulfillments(order_id,job_order_id,method,status,receiver_name,receiver_phone,destination,courier,package_count,scheduled_at,notes,created_by,updated_by)
 values(o.id,jo.id,p_method,case when p_method='pickup' then 'ready_for_pickup' else 'preparing' end,nullif(btrim(coalesce(p_receiver_name,'')),''),nullif(btrim(coalesce(p_receiver_phone,'')),''),nullif(btrim(coalesce(p_destination,'')),''),nullif(btrim(coalesce(p_courier,'')),''),greatest(coalesce(p_package_count,1),1),p_scheduled_at,nullif(btrim(coalesce(p_notes,'')),''),auth.uid(),auth.uid()) returning * into f;
 for item in select * from jsonb_array_elements(p_items) loop
  select * into wi from public.work_items where id=(item->>'work_item_id')::uuid and job_order_id=jo.id and status='completed' and archived_at is null;
  if not found or not exists(select 1 from public.qc_records q where q.work_item_id=wi.id and q.result='passed' and q.archived_at is null) then raise exception 'Active passed QC required'; end if;
  qty:=coalesce((item->>'quantity')::int,0);
  if qty<=0 or qty>wi.quantity then raise exception 'Invalid fulfillment quantity'; end if;
  if (select coalesce(sum(fi.quantity),0) from public.fulfillment_items fi join public.fulfillments fx on fx.id=fi.fulfillment_id where fi.work_item_id=wi.id and fx.archived_at is null and fx.status<>'cancelled') + qty > wi.quantity then raise exception 'Fulfillment quantity exceeds passed quantity'; end if;
  insert into public.fulfillment_items(fulfillment_id,work_item_id,order_item_id,quantity) values(f.id,wi.id,wi.source_order_item_id,qty);
 end loop;
 issued_type:=case when p_method='pickup' then 'pickup_handover' else 'delivery' end;
 n:=public.issue_document_number(issued_type,'fulfillment',f.id,'fulfillment:'||f.id::text,jsonb_build_object('order_id',o.id,'method',p_method));
 update public.fulfillments set fulfillment_number=n where id=f.id returning * into f;
 insert into public.fulfillment_status_history(fulfillment_id,from_status,to_status,note,changed_by) values(f.id,null,f.status,'Fulfillment dibuat',auth.uid());
 perform public.refresh_order_fulfillment_status(o.id); return f; end $$;

create or replace function public.transition_fulfillment_status(p_fulfillment_id uuid,p_to_status text,p_note text default null)
returns public.fulfillments language plpgsql security definer set search_path=public as $$
declare f public.fulfillments; old_status text; allowed boolean:=false; begin
 if not public.has_permission(case when p_to_status in ('delivered','picked_up') then 'shipping.complete' else 'shipping.update' end) then raise exception 'Not authorized'; end if;
 select * into f from public.fulfillments where id=p_fulfillment_id and archived_at is null for update;
 if not found then raise exception 'Fulfillment not found'; end if;
 old_status:=f.status;
 allowed:=case old_status when 'preparing' then p_to_status in ('packing','cancelled','problem') when 'packing' then p_to_status in ('ready_to_ship','ready_for_pickup','problem','cancelled') when 'ready_to_ship' then p_to_status in ('shipped','problem','cancelled') when 'shipped' then p_to_status in ('in_transit','delivered','problem') when 'in_transit' then p_to_status in ('delivered','problem') when 'ready_for_pickup' then p_to_status in ('picked_up','problem','cancelled') when 'problem' then p_to_status in ('preparing','packing','ready_to_ship','ready_for_pickup','cancelled') else false end;
 if not allowed then raise exception 'Transition not allowed'; end if;
 if p_to_status='shipped' and (coalesce(f.courier,'')='' or coalesce(f.tracking_number,'')='') then raise exception 'Courier and tracking number required'; end if;
 if p_to_status in ('delivered','picked_up') and not exists(select 1 from public.fulfillment_files where fulfillment_id=f.id and file_type in ('handover','signature','photo')) then raise exception 'Handover proof required'; end if;
 update public.fulfillments set status=p_to_status,updated_by=auth.uid(),updated_at=now(),shipped_at=case when p_to_status='shipped' then now() else shipped_at end,delivered_at=case when p_to_status='delivered' then now() else delivered_at end,picked_up_at=case when p_to_status='picked_up' then now() else picked_up_at end where id=f.id returning * into f;
 insert into public.fulfillment_status_history(fulfillment_id,from_status,to_status,note,changed_by) values(f.id,old_status,p_to_status,nullif(btrim(coalesce(p_note,'')),''),auth.uid());
 perform public.refresh_order_fulfillment_status(f.order_id); return f; end $$;

create or replace function public.archive_fulfillment(p_fulfillment_id uuid,p_reason text default null)
returns public.fulfillments language plpgsql security definer set search_path=public as $$
declare f public.fulfillments; begin
 if not public.has_permission('shipping.archive') then raise exception 'Not authorized'; end if;
 update public.fulfillments set archived_at=now(),archived_by=auth.uid(),archive_reason=nullif(btrim(coalesce(p_reason,'')),''),updated_at=now()
 where id=p_fulfillment_id and archived_at is null and status in ('preparing','delivered','picked_up','cancelled') returning * into f;
 if not found then raise exception 'Fulfillment cannot be archived in current status'; end if;
 perform public.refresh_order_fulfillment_status(f.order_id); return f; end $$;
create or replace function public.restore_fulfillment(p_fulfillment_id uuid)
returns public.fulfillments language plpgsql security definer set search_path=public as $$
declare f public.fulfillments; begin
 if not public.has_permission('shipping.archive') then raise exception 'Not authorized'; end if;
 update public.fulfillments set archived_at=null,archived_by=null,archive_reason=null,updated_by=auth.uid(),updated_at=now()
 where id=p_fulfillment_id and archived_at is not null returning * into f;
 if not found then raise exception 'Archived fulfillment not found'; end if;
 perform public.refresh_order_fulfillment_status(f.order_id); return f; end $$;

grant execute on function public.update_fulfillment_draft(uuid,text,text,text,text,integer,timestamptz,text),public.refresh_order_fulfillment_status(uuid) to authenticated;;
