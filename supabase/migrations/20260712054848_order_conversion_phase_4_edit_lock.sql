drop policy if exists "Staff can update orders" on public.orders;

create or replace function public.update_order_delivery_details(
  p_order_id uuid,
  p_delivery_method text,
  p_shipping_address text default '',
  p_customer_notes text default '',
  p_admin_notes text default ''
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  result_row public.orders;
begin
  if not public.has_staff_role(array['owner','superadmin','super_admin','sales_admin','admin']) then
    raise exception 'Not authorized to update order';
  end if;

  if p_delivery_method not in ('pickup','delivery') then
    raise exception 'Invalid delivery method';
  end if;

  update public.orders
  set delivery_method = p_delivery_method,
      shipping_address = coalesce(p_shipping_address, ''),
      customer_notes = coalesce(p_customer_notes, ''),
      admin_notes = coalesce(p_admin_notes, ''),
      updated_by = auth.uid(),
      updated_at = now()
  where id = p_order_id
    and archived_at is null
    and status = 'baru'
  returning * into result_row;

  if not found then
    raise exception 'Active new order not found';
  end if;

  insert into public.order_status_history(order_id, from_status, to_status, note, changed_by)
  values (p_order_id, 'baru', 'baru', 'Detail pengiriman dan catatan pesanan diperbarui', auth.uid());

  return result_row;
end;
$$;

revoke all on function public.update_order_delivery_details(uuid,text,text,text,text) from public;
grant execute on function public.update_order_delivery_details(uuid,text,text,text,text) to authenticated;;
