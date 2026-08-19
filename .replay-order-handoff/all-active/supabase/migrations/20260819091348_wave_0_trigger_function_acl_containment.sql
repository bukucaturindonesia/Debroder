-- Wave 0 trigger-only function ACL containment.
-- These functions are invoked by table triggers, never as browser RPCs.
begin;

revoke all on function public.audit_role_permission_change() from public, anon, authenticated, service_role;
revoke all on function public.capture_order_payment_activity() from public, anon, authenticated, service_role;
revoke all on function public.enforce_paid_ready_stock_handover() from public, anon, authenticated, service_role;
revoke all on function public.register_existing_document_number() from public, anon, authenticated, service_role;

commit;
