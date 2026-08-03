alter table public.payment_adjustments add column if not exists archived_at timestamptz;
alter table public.payment_adjustments add column if not exists archived_by uuid references auth.users(id) on delete set null;
alter table public.payment_adjustments add column if not exists archive_reason text;
create or replace function public.archive_payment_adjustment(p_adjustment_id uuid,p_reason text default null)
returns public.payment_adjustments language plpgsql security definer set search_path=public as $$
declare a public.payment_adjustments;
begin
 if not public.has_staff_role(array['owner','superadmin','super_admin','admin']) then raise exception 'Not authorized'; end if;
 update public.payment_adjustments set archived_at=now(),archived_by=auth.uid(),archive_reason=nullif(btrim(coalesce(p_reason,'')),'')
 where id=p_adjustment_id and archived_at is null and status in ('pending','approved','rejected') returning * into a;
 if not found then raise exception 'Adjustment not found'; end if;
 perform public.refresh_order_payment_summary(a.order_id); return a;
end $$;
create or replace function public.restore_payment_adjustment(p_adjustment_id uuid)
returns public.payment_adjustments language plpgsql security definer set search_path=public as $$
declare a public.payment_adjustments;
begin
 if not public.has_staff_role(array['owner','superadmin','super_admin','admin']) then raise exception 'Not authorized'; end if;
 update public.payment_adjustments set archived_at=null,archived_by=null,archive_reason=null
 where id=p_adjustment_id and archived_at is not null returning * into a;
 if not found then raise exception 'Archived adjustment not found'; end if;
 perform public.refresh_order_payment_summary(a.order_id); return a;
end $$;
create or replace function public.permanently_delete_payment_adjustment(p_adjustment_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare oid uuid;
begin
 if not public.has_staff_role(array['superadmin','super_admin']) then raise exception 'Only Super Admin'; end if;
 select order_id into oid from public.payment_adjustments where id=p_adjustment_id and archived_at is not null and status in ('pending','rejected');
 if oid is null then raise exception 'Only archived pending/rejected adjustment can be deleted'; end if;
 delete from public.payment_adjustments where id=p_adjustment_id and archived_at is not null and status in ('pending','rejected');
 perform public.refresh_order_payment_summary(oid);
end $$;
create or replace function public.refresh_order_payment_summary(p_order_id uuid)
returns public.orders language plpgsql security definer set search_path=public as $$
declare result_order public.orders; verified_total bigint; adjustment_total bigint; effective_total bigint; required_total bigint;
begin
 select coalesce(sum(amount),0)::bigint into verified_total from public.order_payments where order_id=p_order_id and status='verified' and archived_at is null;
 select coalesce(sum(effect_amount),0)::bigint into adjustment_total from public.payment_adjustments where order_id=p_order_id and status='approved' and archived_at is null;
 effective_total:=greatest(verified_total+adjustment_total,0);
 select case payment_requirement_type when 'percentage' then ceil(total_amount::numeric*payment_required_percentage/100)::bigint when 'fixed' then least(coalesce(payment_required_amount,0),total_amount::bigint) when 'deposit' then least(coalesce(payment_required_amount,0),total_amount::bigint) else total_amount::bigint end into required_total from public.orders where id=p_order_id for update;
 update public.orders set payment_total_verified=verified_total,payment_effective_total=effective_total,payment_required_amount=required_total,payment_balance=greatest(total_amount::bigint-effective_total,0),payment_percentage=case when total_amount>0 then least(100,round((effective_total::numeric/total_amount::numeric)*100,2)) else 0 end,payment_requirement_met=effective_total>=required_total,payment_production_eligible=effective_total>=required_total,payment_status=case when effective_total<=0 then 'belum_bayar' when effective_total>=total_amount::bigint then 'terverifikasi' else 'menunggu_verifikasi' end,updated_at=now() where id=p_order_id returning * into result_order;
 return result_order;
end $$;
grant execute on function public.archive_payment_adjustment(uuid,text),public.restore_payment_adjustment(uuid),public.permanently_delete_payment_adjustment(uuid) to authenticated;;
