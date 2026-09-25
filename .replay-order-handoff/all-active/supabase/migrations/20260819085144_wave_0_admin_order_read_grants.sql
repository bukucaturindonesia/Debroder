-- Wave 0 admin order read contract.
-- RLS policies on orders/order_items remain the authorization boundary;
-- this migration only restores the table-level SELECT privilege required
-- by authenticated staff reads and customer-owned order reads.
begin;

grant select on public.orders, public.order_items to authenticated;

commit;
