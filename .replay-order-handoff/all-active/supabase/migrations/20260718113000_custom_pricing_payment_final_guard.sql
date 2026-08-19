begin;

create or replace function public.enforce_final_order_pricing_before_payment()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  order_pricing_status text;
  order_total bigint;
begin
  select o.pricing_status, o.total_amount::bigint
  into order_pricing_status, order_total
  from public.orders o
  where o.id = new.order_id;

  if not found then
    raise exception 'Order pembayaran tidak ditemukan';
  end if;

  if coalesce(order_pricing_status, 'final') <> 'final' then
    raise exception 'Pembayaran diblokir sampai harga order ditetapkan final';
  end if;

  if coalesce(order_total, 0) <= 0 then
    raise exception 'Pembayaran diblokir karena total final order tidak valid';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_final_order_pricing_before_payment() from public, anon, authenticated;

drop trigger if exists enforce_final_order_pricing_before_payment on public.order_payments;
create trigger enforce_final_order_pricing_before_payment
before insert on public.order_payments
for each row execute function public.enforce_final_order_pricing_before_payment();

comment on function public.enforce_final_order_pricing_before_payment() is
  'Fail-closed guard: payment rows are accepted only after canonical order pricing is final and positive.';

commit;
