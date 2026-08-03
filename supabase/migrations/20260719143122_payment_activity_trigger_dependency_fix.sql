drop trigger if exists capture_order_payment_activity on public.order_payments;
create trigger capture_order_payment_activity
after insert or update on public.order_payments
for each row execute function public.capture_order_payment_activity();;
