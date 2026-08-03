alter table public.quotations add column if not exists repeated_from_order_id uuid references public.orders(id) on delete set null;
alter table public.quotations add column if not exists repeat_reason text;
alter table public.quotations add column if not exists repeat_idempotency_key text;
create unique index if not exists quotations_repeat_idempotency_idx on public.quotations(repeat_idempotency_key) where repeat_idempotency_key is not null;
create index if not exists quotations_repeated_from_order_idx on public.quotations(repeated_from_order_id);

create table if not exists public.repeat_order_history (
  id uuid primary key default gen_random_uuid(),
  source_order_id uuid not null references public.orders(id) on delete restrict,
  source_quotation_id uuid references public.quotations(id) on delete set null,
  new_quotation_id uuid not null references public.quotations(id) on delete restrict,
  repeat_reason text,
  source_snapshot jsonb not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  idempotency_key text not null unique
);
create index if not exists repeat_order_history_source_idx on public.repeat_order_history(source_order_id,created_at desc);

create or replace function public.create_repeat_order_quotation(
  p_source_order_id uuid,
  p_repeat_reason text,
  p_idempotency_key text
)
returns public.quotations
language plpgsql security definer set search_path=public
as $$
declare
  o public.orders;
  q public.quotations;
  oi public.order_items;
  os public.order_item_services;
  qi public.quotation_items;
  existing_id uuid;
begin
  if not public.has_staff_role(array['owner','superadmin','super_admin','sales_admin','admin']) then raise exception 'Not authorized'; end if;
  if length(btrim(coalesce(p_idempotency_key,'')))<12 then raise exception 'Idempotency key required'; end if;

  select new_quotation_id into existing_id from public.repeat_order_history where idempotency_key=p_idempotency_key;
  if found then select * into q from public.quotations where id=existing_id; return q; end if;

  select * into o from public.orders where id=p_source_order_id and archived_at is null for update;
  if not found then raise exception 'Source order not found'; end if;
  if o.status not in ('selesai','siap_diambil','siap_dikirim') then raise exception 'Repeat order requires fulfilled or ready source order'; end if;

  insert into public.quotations(
    customer_name,company_name,customer_email,customer_phone,billing_address,shipping_address,status,currency,
    public_notes,internal_notes,product_subtotal,service_subtotal,additional_cost,discount_total,
    confirmed_total,estimated_total,has_pending_pricing,created_by,updated_by,repeated_from_order_id,repeat_reason,repeat_idempotency_key
  ) values(
    o.customer_name,o.company_name,o.customer_email,o.customer_phone,o.billing_address,o.shipping_address,'draft',o.currency,
    o.customer_notes,
    concat_ws(E'\n',nullif(o.admin_notes,''),'Pesanan ulang dari '||o.order_number,'Harga wajib diperiksa ulang.'),
    0,0,0,0,null,null,true,auth.uid(),auth.uid(),o.id,nullif(btrim(coalesce(p_repeat_reason,'')),''),p_idempotency_key
  ) returning * into q;

  for oi in select * from public.order_items where order_id=o.id and archived_at is null order by created_at loop
    insert into public.quotation_items(
      quotation_id,product_id,product_variant_id,product_variant_size_id,product_name_snapshot,
      variant_name_snapshot,color_name_snapshot,size_name_snapshot,sku_snapshot,quantity,
      base_price_snapshot,tier_price_snapshot,variant_adjustment_snapshot,size_adjustment_snapshot,
      unit_price,pricing_status,subtotal,customer_notes,production_notes,sort_order
    ) values(
      q.id,oi.product_id,oi.variant_id,oi.variant_size_id,oi.product_name,
      oi.variant_name,oi.color,oi.size,oi.sku,oi.quantity,
      null,null,0,0,null,'pending',null,oi.notes,
      'Referensi dari pesanan '||o.order_number||'. Harga, stok, dan produksi wajib diperiksa ulang.',0
    ) returning * into qi;

    for os in select * from public.order_item_services where order_item_id=oi.id order by created_at loop
      insert into public.quotation_item_services(
        quotation_item_id,custom_service_id,service_name_snapshot,quantity,position,pricing_status,
        unit_price,flat_price,subtotal,notes,sort_order
      ) values(
        qi.id,null,os.service_name,os.quantity,os.position,'pending',null,null,null,
        concat_ws(E'\n',os.notes,'Referensi layanan dari pesanan lama; harga wajib diperiksa ulang.'),0
      );
    end loop;
  end loop;

  insert into public.repeat_order_history(source_order_id,source_quotation_id,new_quotation_id,repeat_reason,source_snapshot,created_by,idempotency_key)
  values(o.id,o.quotation_id,q.id,nullif(btrim(coalesce(p_repeat_reason,'')),''),to_jsonb(o),auth.uid(),p_idempotency_key);

  perform public.write_audit_log('quotation',q.id,'repeat_order_created',to_jsonb(o),to_jsonb(q),p_repeat_reason,'rpc',p_idempotency_key,
    jsonb_build_object('source_order_id',o.id,'source_order_number',o.order_number));
  return q;
end $$;

alter table public.repeat_order_history enable row level security;
drop policy if exists "staff read repeat order history" on public.repeat_order_history;
create policy "staff read repeat order history" on public.repeat_order_history for select to authenticated
using(public.has_staff_role(array['owner','superadmin','super_admin','sales_admin','admin']));
grant select on public.repeat_order_history to authenticated;
grant execute on function public.create_repeat_order_quotation(uuid,text,text) to authenticated;;
