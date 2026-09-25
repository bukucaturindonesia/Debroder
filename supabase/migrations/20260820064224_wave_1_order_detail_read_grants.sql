-- W1 correction: the authenticated order detail read graph includes
-- order_payments and relies on its existing RLS policy for payment.read.

begin;

grant select on public.order_payments to authenticated;

commit;
