create or replace function public.assert_current_actor(p_actor uuid default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_actor uuid:=auth.uid(); begin
 if v_actor is null then raise exception 'Authenticated actor required'; end if;
 if p_actor is not null and p_actor<>v_actor then raise exception 'Actor mismatch'; end if;
 return v_actor; end $$;
revoke all on function public.assert_current_actor(uuid) from public,anon;
grant execute on function public.assert_current_actor(uuid) to authenticated;

create or replace function public.create_payment_adjustment(p_payment_id uuid,p_adjustment_type text,p_amount bigint,p_reason text,p_actor uuid)
returns public.payment_adjustments language plpgsql security definer set search_path=public as $$
declare payment_row public.order_payments; result_adjustment public.payment_adjustments; effect bigint; actor uuid; begin
 actor:=public.assert_current_actor(p_actor);
 if not public.has_permission('payment.adjust') then raise exception 'Tidak berwenang membuat koreksi pembayaran'; end if;
 select * into payment_row from public.order_payments where id=p_payment_id and status='verified' and archived_at is null for update;
 if not found then raise exception 'Hanya pembayaran aktif dan terverifikasi yang dapat dikoreksi'; end if;
 if p_adjustment_type not in ('adjustment_credit','adjustment_debit','reversal','refund','void') then raise exception 'Jenis koreksi tidak valid'; end if;
 if p_amount is null or p_amount<=0 or coalesce(btrim(p_reason),'')='' then raise exception 'Nominal dan alasan koreksi wajib diisi'; end if;
 if p_adjustment_type in ('reversal','refund','void') and p_amount>payment_row.amount then raise exception 'Koreksi melebihi pembayaran asal'; end if;
 effect:=case when p_adjustment_type='adjustment_credit' then p_amount else -p_amount end;
 insert into public.payment_adjustments(order_id,source_payment_id,adjustment_type,amount,effect_amount,reason,created_by)
 values(payment_row.order_id,p_payment_id,p_adjustment_type,p_amount,effect,btrim(p_reason),actor) returning * into result_adjustment;
 insert into public.payment_activity_history(order_id,payment_id,adjustment_id,action,note,actor_id,actor_role)
 values(payment_row.order_id,p_payment_id,result_adjustment.id,'adjustment_created',p_reason,actor,public.current_actor_role());
 return result_adjustment; end $$;

create or replace function public.decide_payment_adjustment(p_adjustment_id uuid,p_approve boolean,p_reason text,p_actor uuid)
returns public.payment_adjustments language plpgsql security definer set search_path=public as $$
declare result_adjustment public.payment_adjustments; actor uuid; actor_role_value text; begin
 actor:=public.assert_current_actor(p_actor); actor_role_value:=public.current_actor_role();
 if not public.has_permission('payment.verify') then raise exception 'Tidak berwenang memutus koreksi'; end if;
 select * into result_adjustment from public.payment_adjustments where id=p_adjustment_id and status='pending' for update;
 if not found then raise exception 'Koreksi pending tidak ditemukan'; end if;
 if result_adjustment.created_by=actor and actor_role_value not in ('superadmin','super_admin') then raise exception 'Pembuat koreksi tidak boleh menyetujui koreksinya sendiri'; end if;
 if not p_approve and coalesce(btrim(p_reason),'')='' then raise exception 'Alasan penolakan wajib diisi'; end if;
 perform set_config('debroder.payment_adjustment_decision','on',true);
 update public.payment_adjustments set status=case when p_approve then 'approved' else 'rejected' end,
 approved_by=case when p_approve then actor else null end,approved_at=case when p_approve then now() else null end,
 rejected_by=case when p_approve then null else actor end,rejected_at=case when p_approve then null else now() end,
 rejection_reason=case when p_approve then null else btrim(p_reason) end
 where id=p_adjustment_id returning * into result_adjustment;
 perform public.refresh_order_payment_summary(result_adjustment.order_id);
 insert into public.payment_activity_history(order_id,payment_id,adjustment_id,action,note,actor_id,actor_role,running_balance)
 values(result_adjustment.order_id,result_adjustment.source_payment_id,result_adjustment.id,
 case when p_approve then 'adjustment_approved' else 'adjustment_rejected' end,p_reason,actor,actor_role_value,
 (select payment_balance from public.orders where id=result_adjustment.order_id));
 return result_adjustment; end $$;

create or replace function public.set_order_payment_requirement(p_order_id uuid,p_requirement_type text,p_percentage numeric,p_amount bigint,p_reason text,p_actor uuid)
returns public.orders language plpgsql security definer set search_path=public as $$
declare result_order public.orders; actor uuid; begin
 actor:=public.assert_current_actor(p_actor);
 if not public.has_permission('payment.adjust') then raise exception 'Tidak berwenang mengubah kebijakan pembayaran'; end if;
 if p_requirement_type not in ('full','percentage','fixed','deposit') then raise exception 'Kebijakan pembayaran tidak valid'; end if;
 if p_requirement_type='percentage' and (p_percentage is null or p_percentage<=0 or p_percentage>100) then raise exception 'Persentase tidak valid'; end if;
 if p_requirement_type in ('fixed','deposit') and (p_amount is null or p_amount<=0) then raise exception 'Nominal minimum tidak valid'; end if;
 if p_requirement_type <> 'full' and coalesce(btrim(p_reason),'')='' then raise exception 'Alasan kebijakan khusus wajib diisi'; end if;
 update public.orders set payment_requirement_type=p_requirement_type,
 payment_required_percentage=case when p_requirement_type='percentage' then p_percentage else 100 end,
 payment_required_amount=case when p_requirement_type in ('fixed','deposit') then least(p_amount,total_amount::bigint) else null end,
 payment_requirement_override_reason=nullif(btrim(coalesce(p_reason,'')),''),payment_requirement_overridden_by=actor,
 payment_requirement_overridden_at=now(),updated_by=actor,updated_at=now()
 where id=p_order_id and archived_at is null returning * into result_order;
 if not found then raise exception 'Pesanan aktif tidak ditemukan'; end if;
 perform public.refresh_order_payment_summary(p_order_id);
 select * into result_order from public.orders where id=p_order_id;
 insert into public.payment_activity_history(order_id,action,note,actor_id,actor_role,running_balance,metadata)
 values(p_order_id,'requirement_changed',p_reason,actor,public.current_actor_role(),result_order.payment_balance,
 jsonb_build_object('type',p_requirement_type,'percentage',p_percentage,'amount',p_amount));
 return result_order; end $$;;
