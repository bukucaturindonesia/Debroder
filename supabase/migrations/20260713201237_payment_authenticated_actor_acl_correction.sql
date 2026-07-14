begin;

-- These RPCs validate auth.uid(), role, and granular payment permission inside
-- their bodies. A previous security lock left the Phase 5B actor-aware RPCs
-- executable only by service_role, which has no end-user auth.uid() in the
-- server adapter, while the legacy verify/reject overloads retained PUBLIC
-- execution through the default function ACL. Normalize both sides: no public
-- or anonymous access, authenticated staff only, and service_role retained for
-- trusted server composition.

revoke all on function public.verify_order_payment(uuid,text)
  from public, anon, authenticated;
revoke all on function public.reject_order_payment(uuid,text)
  from public, anon, authenticated;
revoke all on function public.set_order_payment_requirement(uuid,text,numeric,bigint,text,uuid)
  from public, anon, authenticated;
revoke all on function public.create_payment_adjustment(uuid,text,bigint,text,uuid)
  from public, anon, authenticated;
revoke all on function public.decide_payment_adjustment(uuid,boolean,text,uuid)
  from public, anon, authenticated;

grant execute on function public.verify_order_payment(uuid,text)
  to authenticated, service_role;
grant execute on function public.reject_order_payment(uuid,text)
  to authenticated, service_role;
grant execute on function public.set_order_payment_requirement(uuid,text,numeric,bigint,text,uuid)
  to authenticated, service_role;
grant execute on function public.create_payment_adjustment(uuid,text,bigint,text,uuid)
  to authenticated, service_role;
grant execute on function public.decide_payment_adjustment(uuid,boolean,text,uuid)
  to authenticated, service_role;

commit;
