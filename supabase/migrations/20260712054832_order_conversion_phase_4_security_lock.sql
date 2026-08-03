-- Remove broad direct-delete policies and align order access with admin roles.

drop policy if exists "Superadmin can manage orders" on public.orders;
drop policy if exists "Superadmin can manage order items" on public.order_items;
drop policy if exists "Superadmin can manage order status history" on public.order_status_history;
drop policy if exists "Staff manage order item services" on public.order_item_services;

drop policy if exists "Staff can read orders" on public.orders;
drop policy if exists "Staff can update orders" on public.orders;
drop policy if exists "Staff can read order items" on public.order_items;
drop policy if exists "Staff can read order item services" on public.order_item_services;
drop policy if exists "Staff can read order status history" on public.order_status_history;

create policy "Staff can read orders"
on public.orders
for select
to authenticated
using (public.has_staff_role(array['owner','superadmin','super_admin','sales_admin','admin']));

create policy "Staff can update orders"
on public.orders
for update
to authenticated
using (public.has_staff_role(array['owner','superadmin','super_admin','sales_admin','admin']))
with check (public.has_staff_role(array['owner','superadmin','super_admin','sales_admin','admin']));

create policy "Staff can read order items"
on public.order_items
for select
to authenticated
using (public.has_staff_role(array['owner','superadmin','super_admin','sales_admin','admin']));

create policy "Staff can read order item services"
on public.order_item_services
for select
to authenticated
using (public.has_staff_role(array['owner','superadmin','super_admin','sales_admin','admin']));

create policy "Staff can read order status history"
on public.order_status_history
for select
to authenticated
using (public.has_staff_role(array['owner','superadmin','super_admin','sales_admin','admin']));

create or replace function public.permanently_delete_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_staff_role(array['superadmin','super_admin']) then
    raise exception 'Only Super Admin can permanently delete order';
  end if;

  delete from public.orders
  where id = p_order_id
    and archived_at is not null;

  if not found then
    raise exception 'Order must be archived before permanent deletion';
  end if;
end;
$$;

revoke all on function public.permanently_delete_order(uuid) from public;
grant execute on function public.permanently_delete_order(uuid) to authenticated;;
