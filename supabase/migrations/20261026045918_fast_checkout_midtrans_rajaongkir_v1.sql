-- Candidate only: reconcile the October staging migrations before applying.
-- Roll forward; do not drop tables, reset history, or replay older migrations.
begin;
alter table public.products add column if not exists shipping_weight_grams integer check(shipping_weight_grams > 0);
alter table public.products add column if not exists shipping_length_cm integer check(shipping_length_cm > 0);
alter table public.products add column if not exists shipping_width_cm integer check(shipping_width_cm > 0);
alter table public.products add column if not exists shipping_height_cm integer check(shipping_height_cm > 0);

create table public.fast_checkout_settings (
  id boolean primary key default true check(id), origin_id integer check(origin_id > 0),
  origin_label text not null default '', couriers text[] not null default '{}',
  pickup_enabled boolean not null default false, pickup_location_ids uuid[] not null default '{}',
  payment_enabled boolean not null default false, updated_at timestamptz not null default now()
);
insert into public.fast_checkout_settings(id) values(true);
create table public.fast_checkout_sessions (
  order_id uuid primary key references public.orders(id), request_key text not null unique,
  request_hash text not null, shipping_snapshot jsonb not null, created_at timestamptz not null default now()
);
create table public.fast_payment_attempts (
  id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id),
  attempt_number integer not null, provider_order_id text not null unique,
  merchant_id text not null, environment text not null check(environment='sandbox'),
  amount bigint not null check(amount > 0), status text not null default 'creating'
    check(status in ('creating','pending','paid','deny','cancel','expire','refunded','review')),
  snap_token text, redirect_url text, provider_transaction_id text unique,
  payment_id uuid not null unique default gen_random_uuid(), last_event_hash text,
  reconciliation_note text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(order_id,attempt_number)
);
alter table public.order_payments add column if not exists provider_attempt_id uuid unique references public.fast_payment_attempts(id);
create index fast_payment_attempts_order_idx on public.fast_payment_attempts(order_id,attempt_number desc);
alter table public.fast_checkout_settings enable row level security;
alter table public.fast_checkout_sessions enable row level security;
alter table public.fast_payment_attempts enable row level security;
revoke all on public.fast_checkout_settings,public.fast_checkout_sessions,public.fast_payment_attempts from public,anon,authenticated;
grant all on public.fast_checkout_settings,public.fast_checkout_sessions,public.fast_payment_attempts to service_role;

create function public.fast_checkout_preview_v1(p_items jsonb,p_shipping boolean default true)
returns jsonb language plpgsql security definer set search_path='' as $$
declare line jsonb; row_data record; tier record; total bigint:=0; grams bigint:=0;
  length_cm integer:=0; width_cm integer:=0; height_cm integer:=0; product_qty integer; unit bigint;
begin
  if auth.role() is distinct from 'service_role' then raise exception 'FAST_ACCESS_DENIED'; end if;
  if jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items) not between 1 and 50 then raise exception 'FAST_ITEMS_INVALID'; end if;
  if (select count(*)<>count(distinct x->>'variantSizeId') from jsonb_array_elements(p_items) x) then raise exception 'FAST_DUPLICATE_ITEM'; end if;
  for line in select * from jsonb_array_elements(p_items) loop
    if (line->>'quantity')::integer not between 1 and 100 then raise exception 'FAST_QUANTITY_INVALID'; end if;
    select p.id product_id,p.name,p.base_price,p.shipping_weight_grams,p.shipping_length_cm,p.shipping_width_cm,p.shipping_height_cm,
      coalesce(v.price_adjustment,0)+coalesce(s.price_adjustment,0) adjustment into row_data
      from public.product_variant_sizes s join public.product_variants v on v.id=s.variant_id join public.products p on p.id=v.product_id
      where s.id=(line->>'variantSizeId')::uuid and p.status='active' and p.status_aktif
      and v.status='active' and v.is_active and s.status='active' and s.is_active;
    if not found then raise exception 'FAST_PRODUCT_UNAVAILABLE'; end if;
    select sum((x->>'quantity')::integer) into product_qty from jsonb_array_elements(p_items) x
      join public.product_variant_sizes s on s.id=(x->>'variantSizeId')::uuid
      join public.product_variants v on v.id=s.variant_id where v.product_id=row_data.product_id;
    select t.unit_price,t.quote_required into tier from public.product_price_tiers t
      where t.product_id=row_data.product_id and t.status='active' and product_qty>=t.min_quantity
      and (t.max_quantity is null or product_qty<=t.max_quantity) order by t.min_quantity desc limit 1;
    if found and tier.quote_required then raise exception 'FAST_QUOTATION_REQUIRED'; end if;
    unit:=coalesce(tier.unit_price,row_data.base_price)+row_data.adjustment;
    if unit<=0 then raise exception 'FAST_PRICE_INVALID'; end if;
    total:=total+unit*(line->>'quantity')::integer;
    if p_shipping and (row_data.shipping_weight_grams is null or row_data.shipping_length_cm is null
      or row_data.shipping_width_cm is null or row_data.shipping_height_cm is null) then raise exception 'FAST_WEIGHT_REQUIRED'; end if;
    grams:=grams+coalesce(row_data.shipping_weight_grams,0)*(line->>'quantity')::integer;
    length_cm:=greatest(length_cm,coalesce(row_data.shipping_length_cm,0));
    width_cm:=greatest(width_cm,coalesce(row_data.shipping_width_cm,0));
    -- Conservative stack model; measured packed dimensions need owner UAT.
    height_cm:=height_cm+coalesce(row_data.shipping_height_cm,0)*(line->>'quantity')::integer;
  end loop;
  return jsonb_build_object('subtotal',total,'weight',grams,'dimensions',jsonb_build_object('length',length_cm,'width',width_cm,'height',height_cm));
end $$;

create function public.fast_checkout_create_v1(p_input jsonb,p_quote jsonb,p_request_hash text,p_access_hash text,p_customer_id uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare cfg public.fast_checkout_settings; session_row public.fast_checkout_sessions; result jsonb; o public.orders;
  preview jsonb; items jsonb; address_value text; shipping_cost_value bigint; key_value text:=p_input->>'idempotencyKey';
begin
  if auth.role() is distinct from 'service_role' then raise exception 'FAST_ACCESS_DENIED'; end if;
  if key_value !~ '^[a-zA-Z0-9_-]{16,100}$' or p_access_hash !~ '^[a-f0-9]{64}$' or p_request_hash !~ '^[a-f0-9]{64}$' then raise exception 'FAST_INPUT_INVALID'; end if;
  perform pg_advisory_xact_lock(hashtextextended('fast:'||key_value,0));
  select * into session_row from public.fast_checkout_sessions where request_key=key_value;
  if found then
    if session_row.request_hash<>p_request_hash then raise exception 'FAST_IDEMPOTENCY_CONFLICT'; end if;
    select * into o from public.orders where id=session_row.order_id;
    return jsonb_build_object('order_id',o.id,'order_number',o.order_number,'total',o.total_amount);
  end if;
  if exists(select 1 from public.orders where public_idempotency_key=key_value) then raise exception 'FAST_IDEMPOTENCY_CONFLICT'; end if;
  select * into cfg from public.fast_checkout_settings where id for share;
  if not cfg.payment_enabled then raise exception 'FAST_DISABLED'; end if;
  preview:=public.fast_checkout_preview_v1(p_input->'items',p_input->>'fulfillment'='shipping');
  if p_input->>'fulfillment'='shipping' then
    if p_quote is null or to_timestamp((p_quote->>'expiresAt')::numeric/1000)<=now()
      or (p_quote->>'settingsVersion')::timestamptz is distinct from cfg.updated_at
      or (p_quote->>'origin')::integer is distinct from cfg.origin_id
      or not (p_quote->'rate'->>'code'=any(cfg.couriers))
      or (p_quote->>'subtotal')::bigint<>(preview->>'subtotal')::bigint
      or (p_quote->>'weight')::bigint<>(preview->>'weight')::bigint
      or p_quote->'dimensions' is distinct from preview->'dimensions'
      or length(btrim(p_input->>'addressDetail'))<5 then raise exception 'FAST_QUOTE_INVALID'; end if;
    shipping_cost_value:=(p_quote->'rate'->>'cost')::bigint;
    if shipping_cost_value<=0 then raise exception 'FAST_QUOTE_INVALID'; end if;
    address_value:=concat_ws(', ',p_input->>'addressDetail',p_quote->'destination'->>'label');
  elsif p_input->>'fulfillment'='pickup' then
    if not cfg.pickup_enabled or not ((p_input->>'pickupLocationId')::uuid=any(cfg.pickup_location_ids)) then raise exception 'FAST_PICKUP_INVALID'; end if;
    shipping_cost_value:=0;
  else raise exception 'FAST_FULFILLMENT_INVALID'; end if;
  if p_customer_id is not null then
    if not public.is_verified_registered_customer_checkout_v1(p_customer_id,p_input->'customer'->>'email') then raise exception 'FAST_CUSTOMER_INVALID'; end if;
    perform set_config('debroder.registered_customer_user_id',p_customer_id::text,true);
  end if;
  select jsonb_agg(jsonb_build_object('variant_size_id',x->>'variantSizeId','quantity',(x->>'quantity')::integer)) into items from jsonb_array_elements(p_input->'items') x;
  -- Reuse canonical SKU pricing, stock locks, numbering and anti-duplicate RPC.
  result:=public.create_public_checkout_order(key_value,p_access_hash,p_access_hash,
    p_input->'customer'->>'name',p_input->'customer'->>'phone',p_input->'customer'->>'email',
    p_input->>'fulfillment',address_value,(p_input->>'pickupLocationId')::uuid,'bank_transfer','',items);
  select * into o from public.orders where id=(result->>'order_id')::uuid for update;
  if o.subtotal_amount<>(preview->>'subtotal')::bigint then raise exception 'FAST_PRICE_CHANGED'; end if;
  perform public.activate_public_checkout_order_v2(o.id,p_customer_id,'public_checkout_auto');
  if p_input->>'fulfillment'='shipping' then
    insert into public.order_shipping_quotes(order_id,version,courier,service,cost,estimate,subtotal_snapshot,total_snapshot,status,approved_at)
      values(o.id,1,p_quote->'rate'->>'code',p_quote->'rate'->>'service',shipping_cost_value,p_quote->'rate'->>'etd',o.subtotal_amount,o.subtotal_amount+shipping_cost_value,'approved',now());
    perform public.reserve_public_order_stock(o.id,interval '24 hours',p_customer_id);
  end if;
  update public.orders set shipping_cost=shipping_cost_value,shipping_courier=p_quote->'rate'->>'code',shipping_service=p_quote->'rate'->>'service',
    shipping_estimate=p_quote->'rate'->>'etd',shipping_quoted_at=now(),final_total_approved_at=now(),status='awaiting_payment',
    total_amount=subtotal_amount+shipping_cost_value,payment_required_amount=subtotal_amount+shipping_cost_value,
    payment_balance=subtotal_amount+shipping_cost_value,source_snapshot=coalesce(source_snapshot,'{}'::jsonb)||jsonb_build_object('fast_checkout_v1',true)
    where id=o.id returning * into o;
  insert into public.fast_checkout_sessions(order_id,request_key,request_hash,shipping_snapshot) values(o.id,key_value,p_request_hash,coalesce(p_quote,'{}'::jsonb));
  insert into public.system_audit_log(entity_type,entity_id,action,actor_role,source,new_value)
    values('order',o.id,'fast_checkout_created','customer','fast_checkout_v1',jsonb_build_object('total',o.total_amount));
  return jsonb_build_object('order_id',o.id,'order_number',o.order_number,'total',o.total_amount);
end $$;

create function public.fast_payment_claim_v1(p_order_id uuid,p_merchant_id text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare o public.orders; a public.fast_payment_attempts; next_number integer;
begin
  if auth.role() is distinct from 'service_role' then raise exception 'FAST_ACCESS_DENIED'; end if;
  if not (select payment_enabled from public.fast_checkout_settings where id) then raise exception 'FAST_DISABLED'; end if;
  select * into o from public.orders where id=p_order_id and archived_at is null for update;
  if not found or o.pricing_status<>'final' or o.total_amount<=0 or o.payment_effective_total>0
    or o.status<>'awaiting_payment' or o.final_total_approved_at is null
    or not exists(select 1 from public.fast_checkout_sessions where order_id=o.id)
    or not exists(select 1 from public.stock_reservations where order_id=o.id and status='active' and expires_at>now())
    then raise exception 'FAST_ORDER_NOT_PAYABLE'; end if;
  select * into a from public.fast_payment_attempts where order_id=o.id order by attempt_number desc limit 1;
  if found and a.status not in ('deny','cancel','expire') then return to_jsonb(a)||jsonb_build_object('claimed',false); end if;
  next_number:=coalesce(a.attempt_number,0)+1;
  insert into public.fast_payment_attempts(order_id,attempt_number,provider_order_id,merchant_id,environment,amount)
    values(o.id,next_number,'DBR-'||replace(o.id::text,'-','')||'-'||next_number,p_merchant_id,'sandbox',o.total_amount) returning * into a;
  return to_jsonb(a)||jsonb_build_object('claimed',true);
end $$;

-- Preserve every manual-evidence requirement for historical/manual payments.
-- Gateway evidence is independent of human reviewer/checklist fields.
create or replace function public.guard_verified_payment_evidence_v1()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.provider_attempt_id is not null then
    if auth.role() is distinct from 'service_role' or not exists(
      select 1 from public.fast_payment_attempts a where a.id=new.provider_attempt_id and a.payment_id=new.id
        and a.order_id=new.order_id and a.amount=new.amount and a.status in ('paid','refunded')
        and a.provider_transaction_id is not null and a.last_event_hash is not null
    ) then raise exception 'FAST_GATEWAY_EVIDENCE_REQUIRED'; end if;
    return new;
  end if;
  if new.status='verified' and (tg_op='INSERT' or old.status is distinct from new.status) then
    if new.review_outcome<>'verified' or new.verified_at is null or new.verified_by is null
      or new.reviewed_at is null or new.reviewed_by is null or new.verified_amount is null or new.verified_amount<=0
      or new.verified_transaction_at is null or nullif(btrim(coalesce(new.verified_destination_account,'')),'') is null
      or nullif(btrim(coalesce(new.verified_reference,'')),'') is null or new.check_funds_received is not true
      or new.check_destination_account is not true or new.check_amount is not true
      or new.check_transaction_time is not true or new.check_reference_unique is not true
    then raise exception 'Pembayaran terverifikasi memerlukan checklist dan data mutasi lengkap'; end if;
  end if;
  return new;
end $$;

create function public.fast_payment_apply_v1(p_provider_order_id text,p_transaction_id text,p_merchant_id text,p_amount bigint,p_state text,p_event_hash text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.fast_payment_attempts; o public.orders;
begin
  if auth.role() is distinct from 'service_role' then raise exception 'FAST_ACCESS_DENIED'; end if;
  -- All writers take the order lock before the attempt lock to avoid deadlocks.
  select * into a from public.fast_payment_attempts where provider_order_id=p_provider_order_id;
  if not found then raise exception 'FAST_ATTEMPT_NOT_FOUND'; end if;
  select * into o from public.orders where id=a.order_id for update;
  select * into a from public.fast_payment_attempts where id=a.id for update;
  if a.environment<>'sandbox' or a.merchant_id<>p_merchant_id or a.amount<>p_amount
    or coalesce(p_transaction_id,'')='' or (a.provider_transaction_id is not null and a.provider_transaction_id<>p_transaction_id)
    or p_event_hash !~ '^[a-f0-9]{64}$' then raise exception 'FAST_NOTIFICATION_MISMATCH'; end if;
  if p_state not in ('pending','paid','deny','cancel','expire','refunded') then raise exception 'FAST_STATE_INVALID'; end if;
  if a.status='review' then return jsonb_build_object('review_required',true); end if;
  if a.status='refunded' or (a.status=p_state and a.last_event_hash is not null) or (a.status='paid' and p_state<>'refunded')
    or (a.status in ('deny','cancel','expire') and p_state='pending') then return jsonb_build_object('duplicate',true); end if;
  if p_state='paid' and (o.payment_effective_total>0 or o.status in ('cancelled','expired','completed') or o.archived_at is not null) then
    update public.fast_payment_attempts set status='review',reconciliation_note='Late/second settlement requires finance review',provider_transaction_id=p_transaction_id,last_event_hash=p_event_hash,updated_at=now() where id=a.id;
    insert into public.system_audit_log(entity_type,entity_id,action,actor_role,source,new_value)
      values('order',o.id,'midtrans_review_required','payment_gateway','midtrans_sandbox',jsonb_build_object('attempt_id',a.id));
    return jsonb_build_object('review_required',true);
  end if;
  if p_state='refunded' and a.status<>'paid' then
    update public.fast_payment_attempts set status='review',reconciliation_note='Refund received before settlement ledger; finance review required',provider_transaction_id=p_transaction_id,last_event_hash=p_event_hash,updated_at=now() where id=a.id;
    insert into public.system_audit_log(entity_type,entity_id,action,actor_role,source,new_value)
      values('order',o.id,'midtrans_review_required','payment_gateway','midtrans_sandbox',jsonb_build_object('attempt_id',a.id));
    return jsonb_build_object('review_required',true);
  end if;
  update public.fast_payment_attempts set status=p_state,provider_transaction_id=p_transaction_id,last_event_hash=p_event_hash,updated_at=now() where id=a.id;
  if p_state='paid' then
    insert into public.order_payments(id,order_id,amount,method,channel_name,reference_number,status,review_outcome,
      verified_amount,verified_at,verified_transaction_at,verified_reference,verified_destination_account,provider_attempt_id,submission_source)
      values(a.payment_id,o.id,a.amount,'other','Midtrans Sandbox',p_transaction_id,'verified','verified',
      a.amount,now(),now(),'midtrans:'||p_transaction_id,p_merchant_id,a.id,'admin');
    perform public.refresh_order_payment_summary(o.id);
  elsif p_state='refunded' then
    update public.order_payments set status='refunded' where id=a.payment_id and provider_attempt_id=a.id;
    perform public.refresh_order_payment_summary(o.id);
    update public.orders set payment_status='refunded',payment_production_eligible=false where id=o.id;
  end if;
  insert into public.system_audit_log(entity_type,entity_id,action,actor_role,source,new_value)
    values('order',o.id,'midtrans_'||p_state,'payment_gateway','midtrans_sandbox',jsonb_build_object('attempt_id',a.id,'provider_order_id',p_provider_order_id));
  return jsonb_build_object('applied',true,'status',p_state);
end $$;

create table public.fast_checkout_rate_limits(key_hash text primary key,window_start timestamptz not null,hits integer not null);
alter table public.fast_checkout_rate_limits enable row level security;
revoke all on public.fast_checkout_rate_limits from public,anon,authenticated;
grant all on public.fast_checkout_rate_limits to service_role;
create function public.fast_checkout_limit_v1(p_key_hash text,p_limit integer)
returns boolean language plpgsql security definer set search_path='' as $$
declare count_value integer;
begin
  if auth.role() is distinct from 'service_role' or p_limit not between 1 and 60 or p_key_hash !~ '^[a-f0-9]{64}$' then raise exception 'FAST_ACCESS_DENIED'; end if;
  insert into public.fast_checkout_rate_limits(key_hash,window_start,hits) values(p_key_hash,date_trunc('minute',now()),1)
    on conflict(key_hash) do update set hits=case when fast_checkout_rate_limits.window_start<date_trunc('minute',now()) then 1 else fast_checkout_rate_limits.hits+1 end,
    window_start=date_trunc('minute',now()) returning hits into count_value;
  return count_value<=p_limit;
end $$;
create function public.fast_settings_update_v1(p_settings jsonb,p_actor_id uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
  if auth.role() is distinct from 'service_role' or not exists(select 1 from public.profiles where id=p_actor_id and role in ('owner','superadmin','super_admin') and account_status='ACTIVE' and all_store_access) then raise exception 'FAST_ACCESS_DENIED'; end if;
  update public.fast_checkout_settings set origin_id=(p_settings->>'origin_id')::integer,origin_label=p_settings->>'origin_label',
    couriers=array(select jsonb_array_elements_text(p_settings->'couriers')),
    pickup_enabled=(p_settings->>'pickup_enabled')::boolean,
    pickup_location_ids=array(select jsonb_array_elements_text(p_settings->'pickup_location_ids')::uuid),
    payment_enabled=(p_settings->>'payment_enabled')::boolean,updated_at=clock_timestamp() where id;
  insert into public.system_audit_log(entity_type,action,actor_id,actor_role,source,new_value)
    values('settings','fast_checkout_settings_updated',p_actor_id,'superadmin','fast_checkout_v1',p_settings);
end $$;
create function public.fast_product_shipping_update_v1(p_product_id uuid,p_weight integer,p_length integer,p_width integer,p_height integer,p_actor_id uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
  if auth.role() is distinct from 'service_role' or not exists(select 1 from public.profiles where id=p_actor_id and role in ('owner','superadmin','super_admin') and account_status='ACTIVE' and all_store_access) then raise exception 'FAST_ACCESS_DENIED'; end if;
  if p_weight not between 1 and 1000000 or p_length not between 1 and 1000 or p_width not between 1 and 1000 or p_height not between 1 and 1000 then raise exception 'FAST_WEIGHT_INVALID'; end if;
  update public.products set shipping_weight_grams=p_weight,shipping_length_cm=p_length,shipping_width_cm=p_width,shipping_height_cm=p_height where id=p_product_id;
  if not found then raise exception 'FAST_PRODUCT_UNAVAILABLE'; end if;
  insert into public.system_audit_log(entity_type,entity_id,action,actor_id,actor_role,source,new_value)
    values('product',p_product_id,'product_shipping_updated',p_actor_id,'superadmin','fast_checkout_v1',jsonb_build_object('weight',p_weight,'length',p_length,'width',p_width,'height',p_height));
end $$;
revoke all on function public.fast_settings_update_v1(jsonb,uuid), public.fast_product_shipping_update_v1(uuid,integer,integer,integer,integer,uuid) from public,anon,authenticated;
grant execute on function public.fast_settings_update_v1(jsonb,uuid), public.fast_product_shipping_update_v1(uuid,integer,integer,integer,integer,uuid) to service_role;
revoke all on function public.fast_checkout_limit_v1(text,integer) from public,anon,authenticated;
grant execute on function public.fast_checkout_limit_v1(text,integer) to service_role;
revoke all on function public.fast_checkout_preview_v1(jsonb,boolean), public.fast_checkout_create_v1(jsonb,jsonb,text,text,uuid),
  public.fast_payment_claim_v1(uuid,text),public.fast_payment_apply_v1(text,text,text,bigint,text,text) from public,anon,authenticated;
grant execute on function public.fast_checkout_preview_v1(jsonb,boolean), public.fast_checkout_create_v1(jsonb,jsonb,text,text,uuid),
  public.fast_payment_claim_v1(uuid,text),public.fast_payment_apply_v1(text,text,text,bigint,text,text) to service_role;
commit;
