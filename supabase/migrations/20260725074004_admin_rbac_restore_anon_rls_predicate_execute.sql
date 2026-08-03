begin;

-- Existing RLS policies are attached to PUBLIC and therefore are evaluated
-- for anonymous storefront reads. These SECURITY DEFINER predicates return
-- false/null without a valid authenticated admin session; granting EXECUTE
-- lets RLS evaluate safely without granting admin capabilities.
grant execute on function public.current_request_session_id() to anon;
grant execute on function public.is_current_admin_session() to anon;
grant execute on function public.is_account_enabled() to anon;
grant execute on function public.current_actor_role() to anon;
grant execute on function public.current_actor_store_id() to anon;
grant execute on function public.current_actor_has_all_store_access() to anon;
grant execute on function public.is_admin_guest() to anon;
grant execute on function public.is_superadmin() to anon;
grant execute on function public.is_owner_or_superadmin() to anon;
grant execute on function public.has_permission(text) to anon;
grant execute on function public.has_staff_role(text[]) to anon;
grant execute on function public.can_access_store(uuid) to anon;
grant execute on function public.can_access_inventory_location(uuid) to anon;
grant execute on function public.can_access_order(uuid) to anon;

-- Mutating/session lifecycle RPCs intentionally remain unavailable to anon.

commit;
