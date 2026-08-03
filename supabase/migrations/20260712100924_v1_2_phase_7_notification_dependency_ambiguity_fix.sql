-- Phase 7 dependency fix: remove the default argument from the role-filtered overload so zero-argument calls are unambiguous.
drop function if exists public.staff_notification_recipients(text[]);
create function public.staff_notification_recipients(p_roles text[])
returns uuid[]
language sql
stable
security definer
set search_path='public'
as $$
  select coalesce(array_agg(id),array[]::uuid[])
  from public.profiles
  where role=any(p_roles)
$$;
revoke all on function public.staff_notification_recipients(text[]) from public,anon;
grant execute on function public.staff_notification_recipients(text[]) to authenticated,service_role;
