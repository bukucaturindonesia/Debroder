-- W1 correction: the authenticated Admin shell and order detail support
-- panels read these tables through their existing RLS-protected policies.

begin;

grant select on public.notifications, public.repeat_order_history to authenticated;

commit;
