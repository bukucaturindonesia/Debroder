-- The customer-auth routes use the server-only service-role client for
-- verified-session provisioning and address CRUD. RLS bypass alone does not
-- grant table privileges, so the fresh replay must state this ACL explicitly.
-- No browser role is widened by this correction.
grant select, insert, update on table public.customer_profiles to service_role;
grant select, insert, update, delete on table public.customer_addresses to service_role;
