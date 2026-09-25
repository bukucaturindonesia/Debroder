begin;

create extension if not exists pgcrypto;

alter table public.orders
  add column if not exists public_idempotency_key text,
  add column if not exists public_access_token_hash text,
  add column if not exists whatsapp_confirmation_hash text,
  add column if not exists whatsapp_confirmation_expires_at timestamptz,
  add column if not exists whatsapp_confirmed_at timestamptz,
  add column if not exists whatsapp_confirmed_by uuid references auth.users(id) on delete set null,
  add column if not exists whatsapp_confirmation_attempts integer not null default 0,
  add column if not exists checkout_source text not null default 'admin',
  add column if not exists subtotal_amount bigint not null default 0,
  add column if not exists shipping_cost bigint,
  add column if not exists shipping_courier text,
  add column if not exists shipping_service text,
  add column if not exists shipping_estimate text,
  add column if not exists shipping_quoted_at timestamptz,
  add column if not exists final_total_approved_at timestamptz,
  add column if not exists payment_method text not null default 'bank_transfer',
  add column if not exists pickup_location_id uuid references public.stores(id) on delete set null,
  add column if not exists reservation_expires_at timestamptz;

create unique index if not exists orders_public_idempotency_unique
  on public.orders(public_idempotency_key)
  where public_idempotency_key is not null;
create unique index if not exists orders_public_access_token_unique
  on public.orders(public_access_token_hash)
  where public_access_token_hash is not null;
create index if not exists orders_customer_phone_active_idx
  on public.orders(regexp_replace(customer_phone, '[^0-9]', '', 'g'), created_at desc)
  where archived_at is null;

alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check check (status in (
  'baru','menunggu_pembayaran','sudah_dibayar','masuk_produksi','proses_produksi',
  'quality_check','siap_diambil','siap_dikirim','selesai','dibatalkan',
  'pending_confirmation','new','awaiting_shipping_quote',
  'awaiting_customer_approval','awaiting_payment','confirmed','processing',
  'ready_for_pickup','shipped','picked_up','completed','expired','cancelled','under_review'
));
alter table public.orders drop constraint if exists orders_payment_status_check;
alter table public.orders add constraint orders_payment_status_check check (payment_status in (
  'belum_bayar','menunggu_verifikasi','terverifikasi','ditolak',
  'unpaid','pending_verification','partially_paid','paid','rejected','expired','refunded'
));
alter table public.orders drop constraint if exists orders_checkout_source_check;
alter table public.orders add constraint orders_checkout_source_check
  check (checkout_source in ('admin','quotation','public_checkout','repeat_order'));
alter table public.orders drop constraint if exists orders_payment_method_check;
alter table public.orders add constraint orders_payment_method_check
  check (payment_method in ('bank_transfer','pay_at_store'));
alter table public.orders drop constraint if exists orders_whatsapp_attempts_check;
alter table public.orders add constraint orders_whatsapp_attempts_check
  check (whatsapp_confirmation_attempts between 0 and 5);
alter table public.orders drop constraint if exists orders_commerce_amounts_check;
alter table public.orders add constraint orders_commerce_amounts_check
  check (subtotal_amount >= 0 and (shipping_cost is null or shipping_cost >= 0));

create table if not exists public.stock_reservations (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  order_item_id uuid not null references public.order_items(id) on delete restrict,
  variant_size_id uuid not null references public.product_variant_sizes(id) on delete restrict,
  sku_snapshot text not null,
  quantity integer not null check (quantity > 0),
  status text not null default 'active' check (status in ('active','released','consumed')),
  expires_at timestamptz not null,
  released_at timestamptz,
  consumed_at timestamptz,
  extended_at timestamptz,
  extension_reason text,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_item_id)
);

create index if not exists stock_reservations_available_idx
  on public.stock_reservations(variant_size_id, expires_at)
  where status = 'active';
create index if not exists stock_reservations_order_idx
  on public.stock_reservations(order_id, created_at);

create table if not exists public.order_shipping_quotes (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  version integer not null check (version > 0),
  courier text not null check (btrim(courier) <> ''),
  service text not null check (btrim(service) <> ''),
  cost bigint not null check (cost >= 0),
  estimate text,
  subtotal_snapshot bigint not null check (subtotal_snapshot >= 0),
  total_snapshot bigint not null check (total_snapshot >= 0),
  status text not null default 'pending_customer' check (status in ('pending_customer','approved','superseded')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  unique (order_id, version)
);

create index if not exists order_shipping_quotes_order_idx
  on public.order_shipping_quotes(order_id, version desc);

drop trigger if exists set_stock_reservations_updated_at on public.stock_reservations;
create trigger set_stock_reservations_updated_at
before update on public.stock_reservations
for each row execute function public.set_updated_at();

alter table public.stock_reservations enable row level security;
alter table public.order_shipping_quotes enable row level security;

drop policy if exists "Commerce staff read stock reservations" on public.stock_reservations;
create policy "Commerce staff read stock reservations"
on public.stock_reservations for select to authenticated
using (public.has_permission('order.read'));
drop policy if exists "Commerce staff read shipping quotes" on public.order_shipping_quotes;
create policy "Commerce staff read shipping quotes"
on public.order_shipping_quotes for select to authenticated
using (public.has_permission('order.read'));

revoke all on public.stock_reservations, public.order_shipping_quotes from anon, authenticated;
grant select on public.stock_reservations, public.order_shipping_quotes to authenticated;
grant all on public.stock_reservations, public.order_shipping_quotes to service_role;

create or replace function public.reserve_public_order_stock(
  p_order_id uuid,
  p_duration interval,
  p_actor uuid default null
)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  item_row record;
  physical_stock integer;
  reserved_stock integer;
  expiry_value timestamptz := now() + p_duration;
begin
  if p_duration < interval '1 hour' or p_duration > interval '7 days' then
    raise exception 'Durasi reservasi tidak valid';
  end if;

  for item_row in
    select oi.id, oi.variant_size_id, oi.sku, oi.quantity
    from public.order_items oi
    where oi.order_id = p_order_id
      and oi.archived_at is null
      and oi.variant_size_id is not null
    order by oi.variant_size_id
  loop
    select coalesce(pvs.stock_quantity, pvs.stock, 0)
    into physical_stock
    from public.product_variant_sizes pvs
    where pvs.id = item_row.variant_size_id
    for update;

    if not found then raise exception 'SKU pesanan tidak tersedia'; end if;

    select coalesce(sum(sr.quantity), 0)::integer
    into reserved_stock
    from public.stock_reservations sr
    where sr.variant_size_id = item_row.variant_size_id
      and sr.status = 'active'
      and sr.expires_at > now()
      and sr.order_id <> p_order_id;

    if physical_stock - reserved_stock < item_row.quantity then
      raise exception 'Stok SKU % tidak mencukupi', coalesce(item_row.sku, item_row.variant_size_id::text);
    end if;

    insert into public.stock_reservations(
      order_id, order_item_id, variant_size_id, sku_snapshot, quantity,
      status, expires_at, created_by, updated_by
    ) values (
      p_order_id, item_row.id, item_row.variant_size_id,
      coalesce(item_row.sku, item_row.variant_size_id::text), item_row.quantity,
      'active', expiry_value, p_actor, p_actor
    )
    on conflict (order_item_id) do update set
      quantity = excluded.quantity,
      status = 'active',
      expires_at = excluded.expires_at,
      released_at = null,
      consumed_at = null,
      updated_by = excluded.updated_by,
      updated_at = now();
  end loop;

  update public.orders
  set reservation_expires_at = expiry_value, updated_at = now(), updated_by = p_actor
  where id = p_order_id;

  insert into public.system_audit_log(
    entity_type, entity_id, action, actor_id, actor_role, source, new_value, metadata
  ) values (
    'order', p_order_id, 'stock_reserved', p_actor,
    case when p_actor is null then 'customer' else public.current_actor_role() end,
    'commerce_foundation', jsonb_build_object('expires_at', expiry_value),
    jsonb_build_object('duration_seconds', extract(epoch from p_duration))
  );

  return expiry_value;
end;
$$;

create or replace function public.release_public_order_stock(
  p_order_id uuid,
  p_reason text,
  p_actor uuid default null
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare released_count integer;
begin
  update public.stock_reservations
  set status = 'released', released_at = now(), updated_by = p_actor, updated_at = now()
  where order_id = p_order_id and status = 'active';
  get diagnostics released_count = row_count;

  update public.orders
  set reservation_expires_at = null, updated_at = now(), updated_by = p_actor
  where id = p_order_id;

  if released_count > 0 then
    insert into public.system_audit_log(
      entity_type, entity_id, action, actor_id, actor_role, source, reason, new_value
    ) values (
      'order', p_order_id, 'stock_released', p_actor,
      case when p_actor is null then 'system' else public.current_actor_role() end,
      'commerce_foundation', nullif(btrim(coalesce(p_reason, '')), ''),
      jsonb_build_object('reservation_count', released_count)
    );
  end if;
  return released_count;
end;
$$;

create or replace function public.consume_paid_order_stock(p_order_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare reservation_row record;
declare consumed_count integer := 0;
declare physical_stock integer;
begin
  for reservation_row in
    select sr.id, sr.variant_size_id, sr.quantity
    from public.stock_reservations sr
    where sr.order_id = p_order_id and sr.status = 'active'
    order by sr.variant_size_id
    for update
  loop
    select coalesce(stock_quantity, stock, 0)
    into physical_stock
    from public.product_variant_sizes
    where id = reservation_row.variant_size_id
    for update;

    if physical_stock < reservation_row.quantity then
      raise exception 'Stok fisik tidak cukup untuk menyelesaikan pembayaran';
    end if;

    update public.product_variant_sizes
    set stock = physical_stock - reservation_row.quantity,
        stock_quantity = physical_stock - reservation_row.quantity,
        updated_at = now()
    where id = reservation_row.variant_size_id;

    update public.stock_reservations
    set status = 'consumed', consumed_at = now(), updated_at = now()
    where id = reservation_row.id;
    consumed_count := consumed_count + 1;
  end loop;

  if consumed_count > 0 then
    update public.orders set reservation_expires_at = null, updated_at = now() where id = p_order_id;
    insert into public.system_audit_log(entity_type,entity_id,action,actor_role,source,new_value)
    values('order',p_order_id,'stock_sold','system','commerce_foundation',jsonb_build_object('reservation_count',consumed_count));
  end if;
  return consumed_count;
end;
$$;

create or replace function public.create_public_checkout_order(
  p_idempotency_key text,
  p_access_token_hash text,
  p_whatsapp_confirmation_hash text,
  p_customer_name text,
  p_customer_phone text,
  p_customer_email text,
  p_delivery_method text,
  p_shipping_address text,
  p_pickup_location_id uuid,
  p_payment_method text,
  p_customer_notes text,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_order public.orders;
  new_order_id uuid := gen_random_uuid();
  new_order_number text;
  normalized_phone text := regexp_replace(coalesce(p_customer_phone, ''), '[^0-9]', '', 'g');
  item_value jsonb;
  item_quantity integer;
  variant_size_id uuid;
  product_row record;
  product_total_quantity integer;
  active_reserved integer;
  unit_price_value bigint;
  tier_row record;
  subtotal_value bigint := 0;
  item_subtotal bigint;
  order_item_id uuid;
  active_unpaid integer;
begin
  if p_idempotency_key !~ '^[a-zA-Z0-9_-]{16,100}$' then raise exception 'Kunci checkout tidak valid'; end if;
  if p_access_token_hash !~ '^[0-9a-f]{64}$' or p_whatsapp_confirmation_hash !~ '^[0-9a-f]{64}$' then raise exception 'Token checkout tidak valid'; end if;

  select * into existing_order from public.orders where public_idempotency_key = p_idempotency_key;
  if found then
    return jsonb_build_object('order_id', existing_order.id, 'order_number', existing_order.order_number, 'status', existing_order.status);
  end if;

  if length(btrim(coalesce(p_customer_name, ''))) < 2 then raise exception 'Nama pelanggan tidak valid'; end if;
  if length(normalized_phone) < 9 or length(normalized_phone) > 15 then raise exception 'Nomor WhatsApp tidak valid'; end if;
  if nullif(btrim(coalesce(p_customer_email, '')), '') is not null and p_customer_email !~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then raise exception 'Email tidak valid'; end if;
  if p_delivery_method not in ('pickup','shipping') then raise exception 'Metode fulfillment tidak valid'; end if;
  if p_delivery_method = 'shipping' and length(btrim(coalesce(p_shipping_address, ''))) < 10 then raise exception 'Alamat pengiriman wajib diisi lengkap'; end if;
  if p_delivery_method = 'pickup' and p_pickup_location_id is null then raise exception 'Lokasi pickup wajib dipilih'; end if;
  if p_delivery_method = 'pickup' and not exists(select 1 from public.stores where id=p_pickup_location_id and status_aktif=true and coalesce(status,'published') in ('published','active')) then raise exception 'Lokasi pickup tidak aktif'; end if;
  if p_payment_method not in ('bank_transfer','pay_at_store') or (p_delivery_method='shipping' and p_payment_method<>'bank_transfer') then raise exception 'Metode pembayaran tidak valid'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 50 then raise exception 'Isi keranjang tidak valid'; end if;
  if exists (
    select 1 from jsonb_array_elements(p_items) entry
    group by entry->>'variant_size_id' having count(*) > 1
  ) then raise exception 'Varian yang sama harus digabung dalam satu item'; end if;

  select count(*) into active_unpaid
  from public.orders
  where regexp_replace(customer_phone, '[^0-9]', '', 'g') = normalized_phone
    and archived_at is null
    and status not in ('completed','cancelled','expired','selesai','dibatalkan')
    and payment_status not in ('paid','terverifikasi','refunded');
  if active_unpaid >= 2 then raise exception 'Maksimal dua pesanan belum dibayar per nomor WhatsApp'; end if;

  new_order_number := public.next_order_number();
  insert into public.orders(
    id, order_number, customer_name, customer_phone, customer_email, status,
    total_amount, subtotal_amount, customer_notes, delivery_method, shipping_address,
    payment_status, payment_requirement_type, payment_required_percentage,
    payment_method, pickup_location_id, public_idempotency_key, public_access_token_hash,
    whatsapp_confirmation_hash, whatsapp_confirmation_expires_at, checkout_source,
    source_snapshot
  ) values (
    new_order_id, new_order_number, btrim(p_customer_name), normalized_phone,
    nullif(btrim(coalesce(p_customer_email,'')), ''), 'pending_confirmation',
    0, 0, btrim(coalesce(p_customer_notes,'')), p_delivery_method,
    case when p_delivery_method='shipping' then btrim(p_shipping_address) else '' end,
    'unpaid', 'full', 100, p_payment_method, p_pickup_location_id,
    p_idempotency_key, p_access_token_hash, p_whatsapp_confirmation_hash,
    now() + interval '60 minutes', 'public_checkout',
    jsonb_build_object('channel','web','checkout_version','commerce_foundation_v1')
  );

  for item_value in select value from jsonb_array_elements(p_items)
  loop
    if coalesce(item_value->>'variant_size_id','') !~ '^[0-9a-fA-F-]{36}$' then raise exception 'Varian produk tidak valid'; end if;
    variant_size_id := (item_value->>'variant_size_id')::uuid;
    item_quantity := (item_value->>'quantity')::integer;
    if item_quantity < 1 or item_quantity > 10000 then raise exception 'Quantity tidak valid'; end if;

    select
      p.id product_id, coalesce(nullif(p.name,''),p.nama) product_name,
      p.product_type, p.pricing_mode, coalesce(p.base_price,p.price,p.harga,0)::bigint base_price,
      pv.id variant_id, coalesce(nullif(pv.name,''),nullif(pv.color_name,''),pv.variant_name) variant_name,
      coalesce(nullif(pv.hex_code,''),pv.color_hex) color_hex,
      coalesce(pv.price_adjustment,0)::bigint variant_adjustment,
      pvs.id variant_size_id, pvs.size_name, pvs.sku,
      coalesce(pvs.stock_quantity,pvs.stock,0)::integer physical_stock,
      coalesce(pvs.price_adjustment,0)::bigint size_adjustment
    into product_row
    from public.product_variant_sizes pvs
    join public.product_variants pv on pv.id=pvs.variant_id
    join public.products p on p.id=pv.product_id
    where pvs.id=variant_size_id
      and p.status='active' and p.status_aktif=true
      and pv.status='active' and pv.is_active=true
      and pvs.status='active' and pvs.is_active=true
    for update of pvs;

    if not found then raise exception 'Produk atau varian tidak lagi aktif'; end if;
    if product_row.pricing_mode in ('custom_quote','configurator_based') then raise exception 'Item custom harus melalui quotation atau configurator'; end if;

    select coalesce(sum((entry->>'quantity')::integer),0)::integer
    into product_total_quantity
    from jsonb_array_elements(p_items) entry
    join public.product_variant_sizes grouped_size on grouped_size.id=(entry->>'variant_size_id')::uuid
    join public.product_variants grouped_variant on grouped_variant.id=grouped_size.variant_id
    where grouped_variant.product_id=product_row.product_id;

    select ppt.unit_price, ppt.quote_required into tier_row
    from public.product_price_tiers ppt
    where ppt.product_id=product_row.product_id and ppt.status='active'
      and product_total_quantity>=ppt.min_quantity
      and (ppt.max_quantity is null or product_total_quantity<=ppt.max_quantity)
    order by ppt.min_quantity desc limit 1;
    if found and tier_row.quote_required then raise exception 'Jumlah item memerlukan quotation'; end if;

    unit_price_value := coalesce(tier_row.unit_price::bigint,product_row.base_price)
      + product_row.variant_adjustment + product_row.size_adjustment;
    if unit_price_value < 0 then raise exception 'Harga produk tidak valid'; end if;

    select coalesce(sum(quantity),0)::integer into active_reserved
    from public.stock_reservations
    where variant_size_id=product_row.variant_size_id and status='active' and expires_at>now();
    if product_row.physical_stock-active_reserved < item_quantity then raise exception 'Stok % tidak mencukupi',product_row.sku; end if;

    item_subtotal := unit_price_value*item_quantity;
    subtotal_value := subtotal_value+item_subtotal;
    order_item_id := gen_random_uuid();
    insert into public.order_items(
      id,order_id,product_id,product_name,product_type,variant_id,variant_size_id,
      variant_name,color,size,sku,quantity,unit_price,subtotal,notes,config_snapshot,pricing_status
    ) values (
      order_item_id,new_order_id,product_row.product_id,product_row.product_name,
      coalesce(product_row.product_type,'standard_product'),product_row.variant_id,
      product_row.variant_size_id,product_row.variant_name,product_row.variant_name,
      product_row.size_name,product_row.sku,item_quantity,unit_price_value,item_subtotal,
      left(coalesce(item_value->>'note',''),1000),
      jsonb_build_object('product_name',product_row.product_name,'variant_name',product_row.variant_name,
        'size',product_row.size_name,'sku',product_row.sku,'unit_price',unit_price_value,
        'color_hex',product_row.color_hex),'confirmed'
    );
  end loop;

  update public.orders
  set subtotal_amount=subtotal_value,total_amount=subtotal_value,
      payment_required_amount=subtotal_value,payment_balance=subtotal_value,updated_at=now()
  where id=new_order_id;

  insert into public.order_status_history(order_id,from_status,to_status,note)
  values(new_order_id,null,'pending_confirmation','Pesanan dibuat melalui guest checkout dan menunggu verifikasi WhatsApp.');
  insert into public.system_audit_log(entity_type,entity_id,action,actor_role,source,request_id,new_value)
  values('order',new_order_id,'public_checkout_created','customer','commerce_foundation',p_idempotency_key,
    jsonb_build_object('order_number',new_order_number,'subtotal',subtotal_value,'delivery_method',p_delivery_method));

  return jsonb_build_object('order_id',new_order_id,'order_number',new_order_number,'status','pending_confirmation');
end;
$$;

create or replace function public.verify_public_order_whatsapp(
  p_order_id uuid,
  p_confirmation_code text
)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare order_row public.orders;
declare next_status text;
begin
  if not public.has_permission('order.edit') and not public.has_staff_role(array['owner','superadmin','super_admin','sales_admin','admin']) then
    raise exception 'Tidak berwenang memverifikasi WhatsApp';
  end if;
  select * into order_row from public.orders where id=p_order_id and archived_at is null for update;
  if not found or order_row.status<>'pending_confirmation' then raise exception 'Pesanan tidak menunggu verifikasi'; end if;
  if order_row.whatsapp_confirmation_expires_at<=now() then raise exception 'Kode verifikasi sudah kedaluwarsa'; end if;
  if order_row.whatsapp_confirmation_attempts>=5 then raise exception 'Batas percobaan verifikasi tercapai'; end if;

  if encode(digest(p_confirmation_code,'sha256'),'hex')<>order_row.whatsapp_confirmation_hash then
    update public.orders set whatsapp_confirmation_attempts=whatsapp_confirmation_attempts+1,updated_at=now() where id=p_order_id returning * into order_row;
    insert into public.system_audit_log(entity_type,entity_id,action,actor_id,actor_role,source,new_value)
    values('order',p_order_id,'whatsapp_verification_failed',auth.uid(),public.current_actor_role(),'commerce_foundation',jsonb_build_object('attempts',order_row.whatsapp_confirmation_attempts));
    return order_row;
  end if;

  if order_row.delivery_method='pickup' then
    perform public.reserve_public_order_stock(p_order_id,interval '12 hours',auth.uid());
    next_status := case when order_row.payment_method='pay_at_store' then 'processing' else 'awaiting_payment' end;
  else
    next_status := 'awaiting_shipping_quote';
  end if;

  update public.orders set
    whatsapp_confirmed_at=now(),whatsapp_confirmed_by=auth.uid(),status=next_status,
    whatsapp_confirmation_attempts=whatsapp_confirmation_attempts+1,
    updated_by=auth.uid(),updated_at=now()
  where id=p_order_id returning * into order_row;
  insert into public.order_status_history(order_id,from_status,to_status,note,changed_by)
  values(p_order_id,'pending_confirmation',next_status,'Nomor WhatsApp diverifikasi manual setelah nomor pengirim dicocokkan.',auth.uid());
  insert into public.system_audit_log(entity_type,entity_id,action,actor_id,actor_role,source,new_value)
  values('order',p_order_id,'whatsapp_verified',auth.uid(),public.current_actor_role(),'commerce_foundation',jsonb_build_object('status',next_status));
  return order_row;
end;
$$;

create or replace function public.set_public_order_shipping_quote(
  p_order_id uuid,
  p_courier text,
  p_service text,
  p_cost bigint,
  p_estimate text
)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare order_row public.orders;
declare quote_version integer;
declare old_total numeric;
begin
  if not public.has_permission('order.edit') and not public.has_staff_role(array['owner','superadmin','super_admin','sales_admin','admin']) then raise exception 'Tidak berwenang menetapkan ongkir'; end if;
  if coalesce(btrim(p_courier),'')='' or coalesce(btrim(p_service),'')='' or p_cost<0 then raise exception 'Data ongkir tidak valid'; end if;
  select * into order_row from public.orders where id=p_order_id and archived_at is null for update;
  if not found or order_row.delivery_method<>'shipping' or order_row.whatsapp_confirmed_at is null then raise exception 'Pesanan kurir belum siap diberi ongkir'; end if;
  old_total:=order_row.total_amount;
  select coalesce(max(version),0)+1 into quote_version from public.order_shipping_quotes where order_id=p_order_id;
  update public.order_shipping_quotes set status='superseded' where order_id=p_order_id and status='pending_customer';
  insert into public.order_shipping_quotes(order_id,version,courier,service,cost,estimate,subtotal_snapshot,total_snapshot,created_by)
  values(p_order_id,quote_version,btrim(p_courier),btrim(p_service),p_cost,nullif(btrim(coalesce(p_estimate,'')),''),order_row.subtotal_amount,order_row.subtotal_amount+p_cost,auth.uid());
  update public.orders set shipping_cost=p_cost,shipping_courier=btrim(p_courier),shipping_service=btrim(p_service),
    shipping_estimate=nullif(btrim(coalesce(p_estimate,'')),''),shipping_quoted_at=now(),
    total_amount=subtotal_amount+p_cost,payment_required_amount=subtotal_amount+p_cost,
    payment_balance=subtotal_amount+p_cost,status='awaiting_customer_approval',updated_by=auth.uid(),updated_at=now()
  where id=p_order_id returning * into order_row;
  insert into public.order_status_history(order_id,from_status,to_status,note,changed_by)
  values(p_order_id,'awaiting_shipping_quote','awaiting_customer_approval','Ongkir versi '||quote_version||' ditetapkan.',auth.uid());
  insert into public.system_audit_log(entity_type,entity_id,action,actor_id,actor_role,source,old_value,new_value)
  values('order',p_order_id,'shipping_quote_set',auth.uid(),public.current_actor_role(),'commerce_foundation',jsonb_build_object('total',old_total),jsonb_build_object('total',order_row.total_amount,'version',quote_version));
  return order_row;
end;
$$;

create or replace function public.approve_public_order_total(p_access_token_hash text)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare order_row public.orders;
begin
  select * into order_row from public.orders where public_access_token_hash=p_access_token_hash and archived_at is null for update;
  if not found or order_row.status<>'awaiting_customer_approval' or order_row.shipping_cost is null then raise exception 'Total pesanan belum dapat disetujui'; end if;
  perform public.reserve_public_order_stock(order_row.id,interval '24 hours',null);
  update public.orders set final_total_approved_at=now(),status='awaiting_payment',updated_at=now()
  where id=order_row.id returning * into order_row;
  update public.order_shipping_quotes set status='approved',approved_at=now()
  where order_id=order_row.id and status='pending_customer';
  insert into public.order_status_history(order_id,from_status,to_status,note)
  values(order_row.id,'awaiting_customer_approval','awaiting_payment','Pelanggan menyetujui total final. Stok direservasi 24 jam.');
  insert into public.system_audit_log(entity_type,entity_id,action,actor_role,source,new_value)
  values('order',order_row.id,'shipping_total_approved','customer','commerce_foundation',jsonb_build_object('total',order_row.total_amount));
  return order_row;
end;
$$;

create or replace function public.extend_public_order_reservation(
  p_order_id uuid,
  p_hours integer,
  p_reason text
)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare new_expiry timestamptz;
begin
  if not public.has_permission('order.edit') and not public.has_staff_role(array['owner','superadmin','super_admin','sales_admin','admin']) then raise exception 'Tidak berwenang memperpanjang reservasi'; end if;
  if p_hours<1 or p_hours>168 or coalesce(btrim(p_reason),'')='' then raise exception 'Durasi dan alasan wajib diisi'; end if;
  new_expiry:=now()+make_interval(hours=>p_hours);
  update public.stock_reservations set expires_at=new_expiry,extended_at=now(),extension_reason=btrim(p_reason),updated_by=auth.uid(),updated_at=now()
  where order_id=p_order_id and status='active';
  if not found then raise exception 'Reservasi aktif tidak ditemukan'; end if;
  update public.orders set reservation_expires_at=new_expiry,updated_by=auth.uid(),updated_at=now() where id=p_order_id;
  insert into public.system_audit_log(entity_type,entity_id,action,actor_id,actor_role,source,reason,new_value)
  values('order',p_order_id,'stock_reservation_extended',auth.uid(),public.current_actor_role(),'commerce_foundation',btrim(p_reason),jsonb_build_object('expires_at',new_expiry));
  return new_expiry;
end;
$$;

create or replace function public.expire_public_commerce_orders()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare order_row record;
declare expired_count integer:=0;
begin
  for order_row in
    select id,status from public.orders
    where archived_at is null
      and payment_status not in ('paid','terverifikasi','refunded')
      and (
        (status='pending_confirmation' and whatsapp_confirmation_expires_at<=now())
        or (reservation_expires_at is not null and reservation_expires_at<=now() and status in ('processing','awaiting_payment'))
      )
    for update skip locked
  loop
    perform public.release_public_order_stock(order_row.id,'Kedaluwarsa otomatis',null);
    update public.orders set status='expired',payment_status='expired',updated_at=now() where id=order_row.id;
    insert into public.order_status_history(order_id,from_status,to_status,note)
    values(order_row.id,order_row.status,'expired','Batas verifikasi atau pembayaran berakhir; reservasi dilepas.');
    expired_count:=expired_count+1;
  end loop;
  return expired_count;
end;
$$;

create or replace function public.refresh_order_payment_summary(p_order_id uuid)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare result_order public.orders;
declare verified_total bigint;
declare adjustment_total bigint;
declare effective_total bigint;
declare required_total bigint;
declare has_pending boolean;
declare has_rejected boolean;
begin
  select coalesce(sum(amount),0)::bigint into verified_total from public.order_payments where order_id=p_order_id and status='verified' and archived_at is null;
  select coalesce(sum(effect_amount),0)::bigint into adjustment_total from public.payment_adjustments where order_id=p_order_id and status='approved' and archived_at is null;
  select exists(select 1 from public.order_payments where order_id=p_order_id and status='pending' and archived_at is null) into has_pending;
  select exists(select 1 from public.order_payments where order_id=p_order_id and status='rejected' and archived_at is null) into has_rejected;
  effective_total:=greatest(verified_total+adjustment_total,0);
  select case payment_requirement_type when 'percentage' then ceil(total_amount::numeric*payment_required_percentage/100)::bigint when 'fixed' then least(coalesce(payment_required_amount,0),total_amount::bigint) when 'deposit' then least(coalesce(payment_required_amount,0),total_amount::bigint) else total_amount::bigint end
  into required_total from public.orders where id=p_order_id for update;
  update public.orders set payment_total_verified=verified_total,payment_effective_total=effective_total,
    payment_required_amount=required_total,payment_balance=greatest(total_amount::bigint-effective_total,0),
    payment_percentage=case when total_amount>0 then least(100,round((effective_total::numeric/total_amount::numeric)*100,2)) else 0 end,
    payment_requirement_met=effective_total>=required_total,payment_production_eligible=effective_total>=required_total,
    payment_status=case when has_pending then 'pending_verification' when effective_total>=total_amount::bigint and total_amount>0 then 'paid' when effective_total>0 then 'partially_paid' when has_rejected then 'rejected' else 'unpaid' end,
    status=case when effective_total>=total_amount::bigint and total_amount>0 and status in ('awaiting_payment','processing') then 'confirmed' else status end,
    updated_at=now()
  where id=p_order_id returning * into result_order;
  if result_order.payment_status='paid' then perform public.consume_paid_order_stock(p_order_id); end if;
  return result_order;
end;
$$;

create or replace function public.submit_customer_order_payment(
  p_token_hash text,p_idempotency_key text,p_amount bigint,p_paid_at timestamptz,p_method text,
  p_channel_name text,p_reference_number text,p_customer_notes text,p_proof_bucket text,p_proof_path text,
  p_proof_file_name text,p_proof_mime_type text,p_proof_size_bytes bigint
)
returns public.order_payments
language plpgsql
security definer
set search_path = ''
as $$
declare link_row public.payment_submission_links;
declare result_payment public.order_payments;
begin
  if p_amount is null or p_amount<=0 then raise exception 'Nominal pembayaran harus lebih besar dari nol'; end if;
  if p_method<>'bank_transfer' then raise exception 'V1 hanya menerima transfer bank melalui tautan ini'; end if;
  if p_proof_bucket<>'payment-proofs' or coalesce(p_proof_path,'')='' then raise exception 'Bukti pembayaran wajib diunggah'; end if;
  if p_proof_mime_type not in ('image/png','image/jpeg','application/pdf') then raise exception 'Format bukti pembayaran tidak valid'; end if;
  if p_proof_size_bytes is null or p_proof_size_bytes<=0 or p_proof_size_bytes>5242880 then raise exception 'Ukuran bukti pembayaran maksimal 5 MB'; end if;
  if coalesce(btrim(p_idempotency_key),'')='' then raise exception 'Kunci idempotensi wajib diisi'; end if;
  select * into link_row from public.payment_submission_links where token_hash=p_token_hash for update;
  if not found or link_row.revoked_at is not null or link_row.archived_at is not null then raise exception 'Tautan pembayaran tidak aktif'; end if;
  if link_row.expires_at<=now() then raise exception 'Tautan pembayaran sudah kedaluwarsa'; end if;
  if link_row.used_count>=link_row.max_uses then raise exception 'Batas penggunaan tautan pembayaran telah tercapai'; end if;
  if link_row.last_submission_at is not null and link_row.last_submission_at>now()-interval '10 seconds' then raise exception 'Mohon tunggu sebelum mengirim pembayaran berikutnya'; end if;
  if not exists(select 1 from public.orders where id=link_row.order_id and archived_at is null and status not in ('cancelled','expired','dibatalkan')) then raise exception 'Pesanan tidak tersedia'; end if;
  select * into result_payment from public.order_payments where submission_idempotency_key=p_idempotency_key;
  if found then return result_payment; end if;
  insert into public.order_payments(order_id,amount,paid_at,method,channel_name,reference_number,status,customer_notes,proof_bucket,proof_path,proof_file_name,proof_mime_type,proof_size_bytes,submitted_at,submission_link_id,submission_idempotency_key,submission_source)
  values(link_row.order_id,p_amount,p_paid_at,p_method,nullif(btrim(coalesce(p_channel_name,'')),''),nullif(btrim(coalesce(p_reference_number,'')),''),'pending',nullif(btrim(coalesce(p_customer_notes,'')),''),p_proof_bucket,p_proof_path,p_proof_file_name,p_proof_mime_type,p_proof_size_bytes,now(),link_row.id,p_idempotency_key,'customer_link') returning * into result_payment;
  update public.payment_submission_links set used_count=used_count+1,last_submission_at=now(),updated_at=now() where id=link_row.id;
  update public.orders set payment_status='pending_verification',payment_submitted_at=now(),updated_at=now() where id=link_row.order_id;
  insert into public.payment_activity_history(order_id,payment_id,action,note,metadata)
  values(link_row.order_id,result_payment.id,'customer_submitted','Pembayaran pelanggan menunggu verifikasi',jsonb_build_object('link_id',link_row.id));
  return result_payment;
end;
$$;

revoke all on function public.reserve_public_order_stock(uuid,interval,uuid) from public,anon,authenticated;
revoke all on function public.release_public_order_stock(uuid,text,uuid) from public,anon,authenticated;
revoke all on function public.consume_paid_order_stock(uuid) from public,anon,authenticated;
revoke all on function public.create_public_checkout_order(text,text,text,text,text,text,text,text,uuid,text,text,jsonb) from public,anon,authenticated;
revoke all on function public.approve_public_order_total(text) from public,anon,authenticated;
revoke all on function public.expire_public_commerce_orders() from public,anon,authenticated;
grant execute on function public.create_public_checkout_order(text,text,text,text,text,text,text,text,uuid,text,text,jsonb) to service_role;
grant execute on function public.approve_public_order_total(text) to service_role;
grant execute on function public.expire_public_commerce_orders() to service_role;
grant execute on function public.reserve_public_order_stock(uuid,interval,uuid) to service_role;
grant execute on function public.release_public_order_stock(uuid,text,uuid) to service_role;
grant execute on function public.consume_paid_order_stock(uuid) to service_role;

revoke all on function public.verify_public_order_whatsapp(uuid,text) from public,anon;
revoke all on function public.set_public_order_shipping_quote(uuid,text,text,bigint,text) from public,anon;
revoke all on function public.extend_public_order_reservation(uuid,integer,text) from public,anon;
grant execute on function public.verify_public_order_whatsapp(uuid,text) to authenticated,service_role;
grant execute on function public.set_public_order_shipping_quote(uuid,text,text,bigint,text) to authenticated,service_role;
grant execute on function public.extend_public_order_reservation(uuid,integer,text) to authenticated,service_role;

revoke all on function public.submit_customer_order_payment(text,text,bigint,timestamptz,text,text,text,text,text,text,text,text,bigint) from public,anon,authenticated;
grant execute on function public.submit_customer_order_payment(text,text,bigint,timestamptz,text,text,text,text,text,text,text,text,bigint) to service_role;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('payment-proofs','payment-proofs',false,5242880,array['image/png','image/jpeg','application/pdf'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

do $$
begin
  begin
    create extension if not exists pg_cron;
    if not exists(select 1 from cron.job where jobname='debroder-expire-commerce-orders') then
      perform cron.schedule('debroder-expire-commerce-orders','*/5 * * * *','select public.expire_public_commerce_orders()');
    end if;
  exception when insufficient_privilege or undefined_table or invalid_schema_name then
    raise notice 'pg_cron tidak tersedia; jalankan expire_public_commerce_orders melalui scheduler environment.';
  end;
end $$;

commit;

-- Recovery: unschedule `debroder-expire-commerce-orders`, revoke the new RPCs,
-- and stop application traffic before removing additive columns/tables. Preserve
-- orders, reservations, quotes, audit rows, and payment history during rollback.
