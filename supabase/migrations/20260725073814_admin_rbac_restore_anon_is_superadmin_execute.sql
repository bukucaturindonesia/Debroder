begin;

-- Compatibility fix: existing public RLS policies evaluate is_superadmin()
-- for anonymous reads. The function returns false without an authenticated
-- admin session, so allowing anon to execute it does not grant admin access.
grant execute on function public.is_superadmin() to anon;

commit;
