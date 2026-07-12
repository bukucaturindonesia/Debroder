begin;

alter table public.payment_number_sequences enable row level security;
revoke all on public.payment_number_sequences from anon,authenticated;
grant all on public.payment_number_sequences to service_role;

-- Phase 5A functions were SECURITY DEFINER with default PUBLIC execute.
-- Keep staff RPCs available only after authentication and close legacy public proof submission.
revoke execute on function public.create_order_payment(uuid,bigint,timestamptz,text,text,text,text,text,text,text,text,text,bigint) from public,anon;
revoke execute on function public.update_order_payment_draft(uuid,bigint,timestamptz,text,text,text,text,text) from public,anon;
revoke execute on function public.verify_order_payment(uuid,text) from public,anon;
revoke execute on function public.reject_order_payment(uuid,text) from public,anon;
revoke execute on function public.archive_order_payment(uuid,text) from public,anon;
revoke execute on function public.restore_order_payment(uuid) from public,anon;
revoke execute on function public.permanently_delete_order_payment(uuid) from public,anon;
grant execute on function public.create_order_payment(uuid,bigint,timestamptz,text,text,text,text,text,text,text,text,text,bigint) to authenticated;
grant execute on function public.update_order_payment_draft(uuid,bigint,timestamptz,text,text,text,text,text) to authenticated;
grant execute on function public.verify_order_payment(uuid,text) to authenticated;
grant execute on function public.reject_order_payment(uuid,text) to authenticated;
grant execute on function public.archive_order_payment(uuid,text) to authenticated;
grant execute on function public.restore_order_payment(uuid) to authenticated;
grant execute on function public.permanently_delete_order_payment(uuid) to authenticated;
revoke all on function public.next_payment_number() from public,anon,authenticated;
revoke all on function public.refresh_order_payment_summary(uuid) from public,anon,authenticated;
revoke all on function public.submit_public_payment_proof(uuid,text,text,text) from public,anon,authenticated;

create or replace function public.permanently_delete_payment_submission_link(
  p_link_id uuid,
  p_actor uuid
)
returns void
language plpgsql
security definer
set search_path=''
as $$
begin
  if not public.payment_actor_has_role(p_actor,array['superadmin','super_admin']) then
    raise exception 'Hanya Super Admin yang dapat menghapus permanen tautan pembayaran';
  end if;
  delete from public.payment_submission_links
  where id=p_link_id and archived_at is not null;
  if not found then raise exception 'Tautan harus berada di Gudang Arsip'; end if;
end;
$$;

revoke all on function public.permanently_delete_payment_submission_link(uuid,uuid) from public,anon,authenticated;
grant execute on function public.permanently_delete_payment_submission_link(uuid,uuid) to service_role;

create or replace function public.capture_order_payment_activity()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  action_value text;
  actor_value uuid := coalesce(new.updated_by,new.created_by,(select auth.uid()));
  balance_value bigint;
begin
  if tg_op='INSERT' then
    if new.submission_source <> 'admin' then return new; end if;
    action_value:='payment_created';
  elsif new.status is distinct from old.status then
    action_value:=case new.status
      when 'verified' then 'payment_verified'
      when 'rejected' then 'payment_rejected'
      when 'refunded' then 'payment_refunded'
      else 'payment_status_changed'
    end;
  elsif new.archived_at is distinct from old.archived_at then
    action_value:=case when new.archived_at is null then 'payment_restored' else 'payment_archived' end;
  else
    return new;
  end if;

  perform public.refresh_order_payment_summary(new.order_id);
  select payment_balance into balance_value from public.orders where id=new.order_id;
  insert into public.payment_activity_history(
    order_id,payment_id,action,note,actor_id,actor_role,running_balance,metadata
  ) values (
    new.order_id,new.id,action_value,
    coalesce(new.rejection_reason,new.archive_reason,new.admin_notes),
    actor_value,public.payment_actor_role(actor_value),balance_value,
    jsonb_build_object('from_status',case when tg_op='UPDATE' then old.status else null end,'to_status',new.status)
  );
  return new;
end;
$$;

drop trigger if exists capture_order_payment_activity on public.order_payments;
create trigger capture_order_payment_activity
after insert or update on public.order_payments
for each row execute function public.capture_order_payment_activity();

commit;
