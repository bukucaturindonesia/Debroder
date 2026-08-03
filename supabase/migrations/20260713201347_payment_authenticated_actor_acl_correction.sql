begin;

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

commit;;
