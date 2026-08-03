create or replace function public.create_order_payment(p_order_id uuid,p_amount bigint,p_paid_at timestamptz,p_method text,p_channel_name text default null,p_reference_number text default null,p_customer_notes text default null,p_admin_notes text default null,p_proof_bucket text default null,p_proof_path text default null,p_proof_file_name text default null,p_proof_mime_type text default null,p_proof_size_bytes bigint default null)
returns public.order_payments language plpgsql security definer set search_path=public as $$
declare r public.order_payments; begin
 if not public.has_permission('payment.create') then raise exception 'Not authorized'; end if;
 if p_amount is null or p_amount<=0 then raise exception 'Amount must be greater than zero'; end if;
 if p_method not in ('bank_transfer','cash','qris','ewallet','other') then raise exception 'Invalid payment method'; end if;
 if not exists(select 1 from public.orders where id=p_order_id and archived_at is null and status<>'dibatalkan') then raise exception 'Active order not found'; end if;
 if p_proof_path is not null then
  if p_proof_bucket<>'payment-proofs' then raise exception 'Invalid proof bucket'; end if;
  if p_proof_mime_type not in ('image/png','image/jpeg','image/webp','application/pdf') then raise exception 'Invalid proof MIME type'; end if;
  if coalesce(p_proof_size_bytes,0)<=0 or p_proof_size_bytes>10485760 then raise exception 'Invalid proof size'; end if;
 end if;
 insert into public.order_payments(order_id,amount,paid_at,method,channel_name,reference_number,status,customer_notes,admin_notes,proof_bucket,proof_path,proof_file_name,proof_mime_type,proof_size_bytes,submitted_at,created_by,updated_by)
 values(p_order_id,p_amount,p_paid_at,p_method,nullif(btrim(coalesce(p_channel_name,'')),''),nullif(btrim(coalesce(p_reference_number,'')),''),'pending',nullif(btrim(coalesce(p_customer_notes,'')),''),nullif(btrim(coalesce(p_admin_notes,'')),''),p_proof_bucket,p_proof_path,p_proof_file_name,p_proof_mime_type,p_proof_size_bytes,now(),auth.uid(),auth.uid()) returning * into r;
 update public.orders set payment_status='menunggu_verifikasi',payment_submitted_at=now(),updated_at=now(),updated_by=auth.uid() where id=p_order_id;
 insert into public.payment_activity_history(order_id,payment_id,action,note,actor_id,actor_role,metadata)
 values(p_order_id,r.id,'payment_submitted','Pembayaran '||r.payment_number||' menunggu verifikasi',auth.uid(),public.current_actor_role(),jsonb_build_object('source','admin'));
 return r; end $$;

create or replace function public.verify_order_payment(p_payment_id uuid,p_admin_notes text default null)
returns public.order_payments language plpgsql security definer set search_path=public as $$
declare r public.order_payments; was_met boolean; now_met boolean; begin
 if not public.has_permission('payment.verify') then raise exception 'Not authorized to verify'; end if;
 select o.payment_requirement_met into was_met from public.order_payments p join public.orders o on o.id=p.order_id where p.id=p_payment_id for update of p,o;
 update public.order_payments set status='verified',admin_notes=coalesce(nullif(btrim(coalesce(p_admin_notes,'')),''),admin_notes),verified_at=now(),verified_by=auth.uid(),updated_by=auth.uid(),updated_at=now()
 where id=p_payment_id and status='pending' and archived_at is null returning * into r;
 if not found then raise exception 'Pending payment not found'; end if;
 perform public.refresh_order_payment_summary(r.order_id);
 select payment_requirement_met into now_met from public.orders where id=r.order_id;
 insert into public.payment_activity_history(order_id,payment_id,action,note,actor_id,actor_role,running_balance)
 values(r.order_id,r.id,'payment_verified','Pembayaran diverifikasi',auth.uid(),public.current_actor_role(),(select payment_balance from public.orders where id=r.order_id));
 if not coalesce(was_met,false) and coalesce(now_met,false) then
  insert into public.payment_activity_history(order_id,payment_id,action,note,actor_id,actor_role,running_balance)
  values(r.order_id,r.id,'requirement_met','Pembayaran memenuhi syarat produksi',auth.uid(),public.current_actor_role(),(select payment_balance from public.orders where id=r.order_id));
 end if;
 return r; end $$;

create or replace function public.reject_order_payment(p_payment_id uuid,p_reason text)
returns public.order_payments language plpgsql security definer set search_path=public as $$
declare r public.order_payments; begin
 if not public.has_permission('payment.reject') then raise exception 'Not authorized to reject'; end if;
 if nullif(btrim(coalesce(p_reason,'')),'') is null then raise exception 'Rejection reason is required'; end if;
 update public.order_payments set status='rejected',rejection_reason=btrim(p_reason),rejected_at=now(),rejected_by=auth.uid(),updated_by=auth.uid(),updated_at=now()
 where id=p_payment_id and status='pending' and archived_at is null returning * into r;
 if not found then raise exception 'Pending payment not found'; end if;
 perform public.refresh_order_payment_summary(r.order_id);
 insert into public.payment_activity_history(order_id,payment_id,action,note,actor_id,actor_role,running_balance)
 values(r.order_id,r.id,'payment_rejected',btrim(p_reason),auth.uid(),public.current_actor_role(),(select payment_balance from public.orders where id=r.order_id));
 return r; end $$;

create or replace function public.archive_order_payment(p_payment_id uuid,p_reason text default null)
returns public.order_payments language plpgsql security definer set search_path=public as $$
declare r public.order_payments; begin
 if not public.has_permission('payment.archive') then raise exception 'Not authorized'; end if;
 update public.order_payments set archived_at=now(),archived_by=auth.uid(),archive_reason=nullif(btrim(coalesce(p_reason,'')),''),updated_by=auth.uid(),updated_at=now()
 where id=p_payment_id and archived_at is null and status in ('draft','pending','rejected') returning * into r;
 if not found then raise exception 'Verified payment cannot be archived; use adjustment or reversal'; end if;
 perform public.refresh_order_payment_summary(r.order_id);
 insert into public.payment_activity_history(order_id,payment_id,action,note,actor_id,actor_role,running_balance)
 values(r.order_id,r.id,'payment_archived',p_reason,auth.uid(),public.current_actor_role(),(select payment_balance from public.orders where id=r.order_id));
 return r; end $$;

create or replace function public.restore_order_payment(p_payment_id uuid)
returns public.order_payments language plpgsql security definer set search_path=public as $$
declare r public.order_payments; begin
 if not public.has_permission('payment.archive') then raise exception 'Not authorized'; end if;
 update public.order_payments set archived_at=null,archived_by=null,archive_reason=null,updated_by=auth.uid(),updated_at=now()
 where id=p_payment_id and archived_at is not null and status in ('draft','pending','rejected') returning * into r;
 if not found then raise exception 'Archived editable payment not found'; end if;
 perform public.refresh_order_payment_summary(r.order_id);
 insert into public.payment_activity_history(order_id,payment_id,action,note,actor_id,actor_role,running_balance)
 values(r.order_id,r.id,'payment_restored','Pembayaran dipulihkan',auth.uid(),public.current_actor_role(),(select payment_balance from public.orders where id=r.order_id));
 return r; end $$;

create or replace function public.permanently_delete_order_payment(p_payment_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare oid uuid; begin
 if not public.has_permission('permanent_delete') then raise exception 'Only Super Admin can permanently delete payment'; end if;
 select order_id into oid from public.order_payments where id=p_payment_id and archived_at is not null and status in ('draft','pending','rejected');
 if oid is null then raise exception 'Archived non-verified payment required'; end if;
 delete from public.order_payments where id=p_payment_id and archived_at is not null and status in ('draft','pending','rejected');
 perform public.refresh_order_payment_summary(oid); end $$;

create or replace function public.create_payment_submission_link(p_order_id uuid,p_expires_at timestamptz,p_max_uses integer default 1)
returns jsonb language plpgsql security definer set search_path=public as $$
declare raw_token text; hashed text; link_row public.payment_submission_links; begin
 if not public.has_permission('payment.create') then raise exception 'Not authorized'; end if;
 if p_expires_at<=now() then raise exception 'Expiry must be in the future'; end if;
 if p_max_uses<1 or p_max_uses>20 then raise exception 'Invalid max uses'; end if;
 perform 1 from public.orders where id=p_order_id and archived_at is null and status<>'dibatalkan';
 if not found then raise exception 'Active order not found'; end if;
 raw_token:=encode(gen_random_bytes(32),'hex'); hashed:=encode(digest(raw_token,'sha256'),'hex');
 insert into public.payment_submission_links(order_id,token_hash,expires_at,max_uses,created_by)
 values(p_order_id,hashed,p_expires_at,p_max_uses,auth.uid()) returning * into link_row;
 return jsonb_build_object('id',link_row.id,'token',raw_token,'expires_at',link_row.expires_at,'max_uses',link_row.max_uses); end $$;
create or replace function public.revoke_payment_submission_link(p_link_id uuid,p_reason text default null)
returns public.payment_submission_links language plpgsql security definer set search_path=public as $$
declare link_row public.payment_submission_links; begin
 if not public.has_permission('payment.archive') then raise exception 'Not authorized'; end if;
 update public.payment_submission_links set revoked_at=now(),revoked_by=auth.uid(),revoke_reason=nullif(btrim(coalesce(p_reason,'')),''),updated_at=now()
 where id=p_link_id and revoked_at is null and archived_at is null returning * into link_row;
 if not found then raise exception 'Active link not found'; end if; return link_row; end $$;
create or replace function public.archive_payment_submission_link(p_link_id uuid,p_reason text default null)
returns public.payment_submission_links language plpgsql security definer set search_path=public as $$
declare link_row public.payment_submission_links; begin
 if not public.has_permission('payment.archive') then raise exception 'Not authorized'; end if;
 update public.payment_submission_links set archived_at=now(),archived_by=auth.uid(),archive_reason=nullif(btrim(coalesce(p_reason,'')),''),updated_at=now()
 where id=p_link_id and archived_at is null returning * into link_row;
 if not found then raise exception 'Link not found'; end if; return link_row; end $$;
create or replace function public.restore_payment_submission_link(p_link_id uuid)
returns public.payment_submission_links language plpgsql security definer set search_path=public as $$
declare link_row public.payment_submission_links; begin
 if not public.has_permission('payment.archive') then raise exception 'Not authorized'; end if;
 update public.payment_submission_links set archived_at=null,archived_by=null,archive_reason=null,updated_at=now()
 where id=p_link_id and archived_at is not null returning * into link_row;
 if not found then raise exception 'Archived link not found'; end if; return link_row; end $$;
create or replace function public.permanently_delete_payment_submission_link(p_link_id uuid)
returns void language plpgsql security definer set search_path=public as $$ begin
 if not public.has_permission('permanent_delete') then raise exception 'Only Super Admin'; end if;
 delete from public.payment_submission_links where id=p_link_id and archived_at is not null;
 if not found then raise exception 'Link must be archived'; end if; end $$;;
