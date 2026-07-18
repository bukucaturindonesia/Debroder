begin;

-- Owner-populated canonical Indonesian region catalog. This migration does
-- not invent or seed government data; Preview must load an owner-approved
-- dataset before Custom shipping is enabled operationally.
create table if not exists public.indonesia_regions (
  code text primary key check (code ~ '^[0-9A-Za-z.-]{1,24}$'),
  level text not null check (level in ('province','regency','district','village')),
  parent_code text references public.indonesia_regions(code) on delete restrict,
  name text not null check (btrim(name) <> ''),
  postal_codes text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((level='province' and parent_code is null) or (level<>'province' and parent_code is not null))
);
create index if not exists indonesia_regions_parent_idx on public.indonesia_regions(level,parent_code,name) where is_active;
alter table public.indonesia_regions enable row level security;
revoke all on public.indonesia_regions from public,anon,authenticated;
grant select,insert,update,delete on public.indonesia_regions to service_role;

create table if not exists public.order_address_snapshots (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  version integer not null default 1 check (version > 0),
  recipient_name text not null,
  recipient_phone text not null,
  province_id text not null references public.indonesia_regions(code),
  province_name text not null,
  regency_id text not null references public.indonesia_regions(code),
  regency_name text not null,
  district_id text not null references public.indonesia_regions(code),
  district_name text not null,
  village_id text not null references public.indonesia_regions(code),
  village_name text not null,
  postal_code text not null check (postal_code ~ '^[0-9]{5}$'),
  address_detail text not null,
  house_number text,
  rt text check (rt is null or rt ~ '^[0-9]{1,3}$'),
  rw text check (rw is null or rw ~ '^[0-9]{1,3}$'),
  landmark text,
  courier_note text,
  formatted_address text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(order_id,version)
);
create unique index if not exists order_address_snapshots_current_idx on public.order_address_snapshots(order_id) where version=1;
alter table public.order_address_snapshots enable row level security;
create policy "Staff read order address snapshots" on public.order_address_snapshots for select to authenticated using (public.has_permission('order.read'));
revoke all on public.order_address_snapshots from public,anon;
revoke insert,update,delete on public.order_address_snapshots from authenticated;
grant select on public.order_address_snapshots to authenticated;
grant all on public.order_address_snapshots to service_role;

-- Backward-compatible overload: the frozen 13-argument Custom checkout remains
-- available. Only Custom shipping calls this 14-argument structured variant.
create or replace function public.create_public_custom_checkout_order(
  p_idempotency_key text,p_access_token_hash text,p_whatsapp_confirmation_hash text,
  p_customer_name text,p_customer_phone text,p_customer_email text,p_delivery_method text,
  p_shipping_address text,p_pickup_location_id uuid,p_payment_method text,p_customer_notes text,
  p_items jsonb,p_custom_projects jsonb,p_shipping_address_snapshot jsonb
)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  result_value jsonb; province_row public.indonesia_regions; regency_row public.indonesia_regions;
  district_row public.indonesia_regions; village_row public.indonesia_regions; formatted_value text;
  postal_value text; recipient_name_value text; recipient_phone_value text; detail_value text;
  house_value text; rt_value text; rw_value text; landmark_value text; courier_note_value text;
begin
  if p_delivery_method<>'shipping' then
    return public.create_public_custom_checkout_order(p_idempotency_key,p_access_token_hash,p_whatsapp_confirmation_hash,p_customer_name,p_customer_phone,p_customer_email,p_delivery_method,p_shipping_address,p_pickup_location_id,p_payment_method,p_customer_notes,p_items,p_custom_projects);
  end if;
  if jsonb_typeof(p_shipping_address_snapshot)<>'object' then raise exception 'Alamat terstruktur wajib diisi'; end if;
  select * into province_row from public.indonesia_regions where code=p_shipping_address_snapshot->>'provinceId' and level='province' and parent_code is null and is_active;
  select * into regency_row from public.indonesia_regions where code=p_shipping_address_snapshot->>'regencyId' and level='regency' and parent_code=province_row.code and is_active;
  select * into district_row from public.indonesia_regions where code=p_shipping_address_snapshot->>'districtId' and level='district' and parent_code=regency_row.code and is_active;
  select * into village_row from public.indonesia_regions where code=p_shipping_address_snapshot->>'villageId' and level='village' and parent_code=district_row.code and is_active;
  if province_row.code is null or regency_row.code is null or district_row.code is null or village_row.code is null then raise exception 'Hierarki alamat tidak valid'; end if;
  postal_value:=btrim(coalesce(p_shipping_address_snapshot->>'postalCode',''));
  if postal_value!~'^[0-9]{5}$' or (cardinality(village_row.postal_codes)>0 and not postal_value=any(village_row.postal_codes)) then raise exception 'Kode pos tidak valid'; end if;
  recipient_name_value:=left(btrim(coalesce(p_shipping_address_snapshot->>'recipientName','')),150);
  recipient_phone_value:=regexp_replace(coalesce(p_shipping_address_snapshot->>'recipientPhone',''),'[^0-9]','','g');
  detail_value:=left(btrim(coalesce(p_shipping_address_snapshot->>'addressDetail','')),500);
  house_value:=nullif(left(btrim(coalesce(p_shipping_address_snapshot->>'houseNumber','')),80),'');
  rt_value:=nullif(left(btrim(coalesce(p_shipping_address_snapshot->>'rt','')),3),'');
  rw_value:=nullif(left(btrim(coalesce(p_shipping_address_snapshot->>'rw','')),3),'');
  landmark_value:=nullif(left(btrim(coalesce(p_shipping_address_snapshot->>'landmark','')),300),'');
  courier_note_value:=nullif(left(btrim(coalesce(p_shipping_address_snapshot->>'courierNote','')),500),'');
  if length(recipient_name_value)<2 or length(recipient_phone_value)<9 or length(detail_value)<5 or (rt_value is not null and rt_value!~'^[0-9]{1,3}$') or (rw_value is not null and rw_value!~'^[0-9]{1,3}$') then raise exception 'Detail alamat tidak valid'; end if;
  formatted_value:=concat_ws(', ',detail_value,case when house_value is not null then 'No. '||house_value end,case when rt_value is not null then 'RT '||rt_value end,case when rw_value is not null then 'RW '||rw_value end,village_row.name,district_row.name,regency_row.name,province_row.name,postal_value);
  result_value:=public.create_public_custom_checkout_order(p_idempotency_key,p_access_token_hash,p_whatsapp_confirmation_hash,p_customer_name,p_customer_phone,p_customer_email,p_delivery_method,formatted_value,p_pickup_location_id,p_payment_method,p_customer_notes,p_items,p_custom_projects);
  insert into public.order_address_snapshots(order_id,recipient_name,recipient_phone,province_id,province_name,regency_id,regency_name,district_id,district_name,village_id,village_name,postal_code,address_detail,house_number,rt,rw,landmark,courier_note,formatted_address)
  values((result_value->>'order_id')::uuid,recipient_name_value,recipient_phone_value,province_row.code,province_row.name,regency_row.code,regency_row.name,district_row.code,district_row.name,village_row.code,village_row.name,postal_value,detail_value,house_value,rt_value,rw_value,landmark_value,courier_note_value,formatted_value)
  on conflict(order_id,version) do nothing;
  return result_value;
end $$;
revoke all on function public.create_public_custom_checkout_order(text,text,text,text,text,text,text,text,uuid,text,text,jsonb,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.create_public_custom_checkout_order(text,text,text,text,text,text,text,text,uuid,text,text,jsonb,jsonb,jsonb) to service_role;

alter table public.customer_uploads
  add column if not exists design_version integer not null default 1,
  add column if not exists design_stage text not null default 'customer_upload',
  add column if not exists replaces_upload_id uuid references public.customer_uploads(id) on delete restrict,
  add column if not exists is_active_version boolean not null default true,
  add column if not exists version_note text;
alter table public.customer_uploads drop constraint if exists customer_uploads_design_stage_check;
alter table public.customer_uploads add constraint customer_uploads_design_stage_check check(design_stage in ('customer_upload','revision_requested','revised_upload','approved_design','final_production_file'));
create index if not exists customer_uploads_design_version_idx on public.customer_uploads(linked_order_id,linked_order_item_id,design_version desc);

create or replace function public.register_customer_design_upload_v1(
  p_session_token text,p_bucket_id text,p_storage_path text,p_original_filename text,p_sanitized_filename text,
  p_mime_type text,p_extension text,p_size_bytes bigint,p_design_stage text default 'customer_upload',
  p_replaces_upload_id uuid default null,p_version_note text default null
)
returns public.customer_uploads language plpgsql security definer set search_path='' as $$
declare previous_row public.customer_uploads; result_row public.customer_uploads; next_version integer:=1;
begin
  if p_design_stage not in ('customer_upload','revised_upload') then raise exception 'Tahap file pelanggan tidak valid'; end if;
  if p_replaces_upload_id is not null then
    select * into previous_row from public.customer_uploads where id=p_replaces_upload_id and session_token=p_session_token and is_active_version and status in ('uploaded','linked') for update;
    if not found then raise exception 'Versi file sebelumnya tidak ditemukan'; end if;
    if p_design_stage<>'revised_upload' then raise exception 'File pengganti harus berstatus revisi'; end if;
    next_version:=previous_row.design_version+1;
  elsif p_design_stage<>'customer_upload' then raise exception 'Revisi harus menunjuk versi sebelumnya'; end if;
  insert into public.customer_uploads(session_token,bucket_id,storage_path,original_filename,sanitized_filename,mime_type,extension,size_bytes,status,design_version,design_stage,replaces_upload_id,is_active_version,version_note)
  values(p_session_token,p_bucket_id,p_storage_path,p_original_filename,p_sanitized_filename,p_mime_type,p_extension,p_size_bytes,'uploaded',next_version,p_design_stage,p_replaces_upload_id,true,nullif(btrim(coalesce(p_version_note,'')),'')) returning * into result_row;
  if p_replaces_upload_id is not null then update public.customer_uploads set is_active_version=false,updated_at=now() where id=p_replaces_upload_id; end if;
  return result_row;
end $$;
revoke all on function public.register_customer_design_upload_v1(text,text,text,text,text,text,text,bigint,text,uuid,text) from public,anon,authenticated;
grant execute on function public.register_customer_design_upload_v1(text,text,text,text,text,text,text,bigint,text,uuid,text) to service_role;

alter table public.fulfillments
  add column if not exists final_verification_checklist jsonb,
  add column if not exists final_verified_at timestamptz,
  add column if not exists final_verified_by uuid references auth.users(id) on delete set null,
  add column if not exists final_verification_note text;

create or replace function public.complete_custom_fulfillment_final_verification(
  p_fulfillment_id uuid,p_checklist jsonb,p_note text,p_expected_updated_at timestamptz
)
returns public.fulfillments language plpgsql security definer set search_path='' as $$
declare result_row public.fulfillments; order_row public.orders; required_key text;
begin
  if not public.has_permission('shipping.update') then raise exception 'Tidak berwenang melakukan pengecekan akhir'; end if;
  select * into result_row from public.fulfillments where id=p_fulfillment_id and archived_at is null for update;
  if not found then raise exception 'Dokumen penyerahan tidak ditemukan'; end if;
  if result_row.status<>'packing' then raise exception 'Pengecekan akhir hanya tersedia setelah packing'; end if;
  if result_row.updated_at is distinct from p_expected_updated_at then raise exception 'Data ini telah diperbarui oleh admin lain'; end if;
  select * into order_row from public.orders where id=result_row.order_id for update;
  if jsonb_array_length(coalesce(order_row.custom_project_snapshot,'[]'::jsonb))=0 then raise exception 'Pengecekan akhir khusus Custom tidak diperlukan'; end if;
  if not coalesce(order_row.payment_production_eligible,false) then raise exception 'Syarat pembayaran belum terpenuhi'; end if;
  if result_row.method='shipping' and not exists(select 1 from public.order_address_snapshots where order_id=order_row.id) then raise exception 'Snapshot alamat terstruktur belum tersedia'; end if;
  if jsonb_typeof(p_checklist)<>'object' then raise exception 'Checklist pengecekan akhir tidak valid'; end if;
  foreach required_key in array array['order_number','customer','phone','product','variant','color','size','quantity','method','design','placement','print_size','personalization','qc','package_content','package_count','recipient_address','postal_code','fulfillment_method','package_condition'] loop
    if coalesce((p_checklist->>required_key)::boolean,false) is not true then raise exception 'Checklist pengecekan akhir belum lengkap'; end if;
  end loop;
  update public.fulfillments set final_verification_checklist=p_checklist,final_verified_at=now(),final_verified_by=auth.uid(),final_verification_note=nullif(btrim(coalesce(p_note,'')),''),updated_by=auth.uid(),updated_at=now() where id=result_row.id returning * into result_row;
  insert into public.fulfillment_status_history(fulfillment_id,from_status,to_status,note,changed_by,metadata)
  values(result_row.id,'packing','packing','Pengecekan akhir Custom selesai',auth.uid(),jsonb_build_object('event','custom_final_verification_completed'));
  return result_row;
end $$;
revoke all on function public.complete_custom_fulfillment_final_verification(uuid,jsonb,text,timestamptz) from public,anon;
grant execute on function public.complete_custom_fulfillment_final_verification(uuid,jsonb,text,timestamptz) to authenticated,service_role;

create or replace function public.guard_custom_fulfillment_final_verification_v1()
returns trigger language plpgsql security definer set search_path='' as $$
declare is_custom boolean;
begin
  select jsonb_array_length(coalesce(custom_project_snapshot,'[]'::jsonb))>0 into is_custom from public.orders where id=new.order_id;
  if not coalesce(is_custom,false) then return new; end if;
  if old.status='packing' and new.status in ('ready_to_ship','ready_for_pickup') and new.final_verified_at is null then raise exception 'Pengecekan akhir Custom wajib diselesaikan sebelum pengiriman'; end if;
  if old.status='packing' and new.status='packing' and (old.receiver_name,old.receiver_phone,old.destination,old.courier,old.tracking_number,old.package_count) is distinct from (new.receiver_name,new.receiver_phone,new.destination,new.courier,new.tracking_number,new.package_count) then
    new.final_verification_checklist:=null; new.final_verified_at:=null; new.final_verified_by:=null; new.final_verification_note:=null;
  end if;
  return new;
end $$;
drop trigger if exists guard_custom_fulfillment_final_verification_v1 on public.fulfillments;
create trigger guard_custom_fulfillment_final_verification_v1 before update on public.fulfillments for each row execute function public.guard_custom_fulfillment_final_verification_v1();
revoke all on function public.guard_custom_fulfillment_final_verification_v1() from public,anon,authenticated;

-- Custom quotation approval is attached to the existing order-first public
-- checkout. It records immutable versions and approval evidence while the
-- existing formal quotation module remains untouched for its current flows.
alter table public.orders
  add column if not exists custom_review_started_at timestamptz,
  add column if not exists custom_review_completed_at timestamptz,
  add column if not exists custom_reviewed_by uuid references auth.users(id) on delete set null,
  add column if not exists custom_quote_version integer,
  add column if not exists custom_quote_status text,
  add column if not exists custom_quote_locked_at timestamptz,
  add column if not exists custom_quote_locked_total bigint;
alter table public.orders drop constraint if exists orders_custom_quote_status_check;
alter table public.orders add constraint orders_custom_quote_status_check check(custom_quote_status is null or custom_quote_status in ('draft','sent','revision_requested','locked','expired'));

create table if not exists public.custom_order_quotation_versions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  version_number integer not null check(version_number>0),
  status text not null check(status in ('sent','revision_requested','locked','expired','superseded')),
  previous_total bigint,
  quoted_total bigint not null check(quoted_total>0),
  pricing_components jsonb not null,
  review_checklist jsonb not null,
  design_version_snapshot jsonb not null default '[]'::jsonb,
  valid_until timestamptz not null,
  sent_by uuid references auth.users(id) on delete set null,
  sent_at timestamptz not null default now(),
  locked_at timestamptz,
  created_at timestamptz not null default now(),
  unique(order_id,version_number)
);
create unique index if not exists custom_order_quotation_one_sent_idx on public.custom_order_quotation_versions(order_id) where status='sent';
alter table public.custom_order_quotation_versions enable row level security;
create policy "Staff read custom quotation versions" on public.custom_order_quotation_versions for select to authenticated using(public.has_permission('order.read'));
revoke all on public.custom_order_quotation_versions from public,anon;
grant select on public.custom_order_quotation_versions to authenticated;
grant all on public.custom_order_quotation_versions to service_role;

create table if not exists public.custom_order_customer_approvals (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  quotation_version_id uuid not null references public.custom_order_quotation_versions(id) on delete restrict,
  quotation_version integer not null,
  approved_total bigint not null,
  design_version_snapshot jsonb not null,
  approval_channel text not null default 'public_order_link',
  access_token_hash text not null,
  acknowledgement text not null,
  approved_at timestamptz not null default now(),
  unique(quotation_version_id)
);
alter table public.custom_order_customer_approvals enable row level security;
create policy "Staff read custom approvals" on public.custom_order_customer_approvals for select to authenticated using(public.has_permission('order.read'));
revoke all on public.custom_order_customer_approvals from public,anon;
grant select on public.custom_order_customer_approvals to authenticated;
grant all on public.custom_order_customer_approvals to service_role;

create or replace function public.start_custom_order_review_v1(p_order_id uuid,p_expected_updated_at timestamptz)
returns public.orders language plpgsql security definer set search_path='' as $$
declare result_row public.orders; previous_status text;
begin
  if not public.has_permission('order.edit') then raise exception 'Tidak berwenang memulai review'; end if;
  select * into result_row from public.orders where id=p_order_id and archived_at is null for update;
  if not found or jsonb_array_length(coalesce(result_row.custom_project_snapshot,'[]'::jsonb))=0 then raise exception 'Custom Order tidak ditemukan'; end if;
  if result_row.updated_at is distinct from p_expected_updated_at then raise exception 'Order telah diperbarui oleh admin lain'; end if;
  if result_row.custom_review_started_at is null then
    previous_status:=result_row.status;
    update public.orders set custom_review_started_at=now(),status='under_review',updated_by=auth.uid(),updated_at=now() where id=p_order_id returning * into result_row;
    insert into public.order_status_history(order_id,from_status,to_status,note,changed_by) values(p_order_id,previous_status,'under_review','Review Custom Order dimulai.',auth.uid());
  end if;
  return result_row;
end $$;

create or replace function public.approve_custom_order_review_v1(p_order_id uuid,p_checklist jsonb,p_note text,p_expected_updated_at timestamptz)
returns public.orders language plpgsql security definer set search_path='' as $$
declare result_row public.orders; required_key text;
begin
  if not public.has_permission('order.edit') then raise exception 'Tidak berwenang menyetujui review'; end if;
  select * into result_row from public.orders where id=p_order_id and archived_at is null for update;
  if not found or result_row.custom_review_started_at is null then raise exception 'Mulai review terlebih dahulu'; end if;
  if result_row.updated_at is distinct from p_expected_updated_at then raise exception 'Order telah diperbarui oleh admin lain'; end if;
  if jsonb_typeof(p_checklist)<>'object' then raise exception 'Checklist review tidak valid'; end if;
  foreach required_key in array array['product','variant','quantity','method','print_size','placement','design','notes','address','feasibility'] loop
    if coalesce((p_checklist->>required_key)::boolean,false) is not true then raise exception 'Checklist review belum lengkap'; end if;
  end loop;
  update public.orders set custom_review_completed_at=now(),custom_reviewed_by=auth.uid(),status='under_review',updated_by=auth.uid(),updated_at=now() where id=p_order_id returning * into result_row;
  insert into public.system_audit_log(entity_type,entity_id,action,actor_id,actor_role,source,reason,new_value)
  values('order',p_order_id,'custom_order_review_approved',auth.uid(),public.current_actor_role(),'custom_order_revision',nullif(btrim(coalesce(p_note,'')),''),p_checklist);
  return result_row;
end $$;

create or replace function public.send_custom_order_quotation_v1(p_order_id uuid,p_checklist jsonb,p_valid_days integer,p_expected_updated_at timestamptz)
returns public.custom_order_quotation_versions language plpgsql security definer set search_path='' as $$
declare order_row public.orders; result_row public.custom_order_quotation_versions; required_key text; next_version integer; previous_total bigint; design_snapshot jsonb;
begin
  if not public.has_permission('order.edit') then raise exception 'Tidak berwenang mengirim penawaran'; end if;
  if p_valid_days<1 or p_valid_days>30 then raise exception 'Masa berlaku penawaran tidak valid'; end if;
  select * into order_row from public.orders where id=p_order_id and archived_at is null for update;
  if not found or order_row.custom_review_completed_at is null then raise exception 'Review Custom belum disetujui'; end if;
  if order_row.updated_at is distinct from p_expected_updated_at then raise exception 'Order telah diperbarui oleh admin lain'; end if;
  if order_row.pricing_status<>'final' or order_row.total_amount<=0 then raise exception 'Harga Custom belum final'; end if;
  if order_row.whatsapp_confirmed_at is null then raise exception 'Pelanggan belum diverifikasi'; end if;
  if jsonb_typeof(p_checklist)<>'object' then raise exception 'Checklist harga tidak valid'; end if;
  foreach required_key in array array['product','variant','quantity','base_price','method','print_size','placement','personalization','design','duplicate_charge','setup_fee','adjustments','subtotal','final_total','customer_preview'] loop
    if coalesce((p_checklist->>required_key)::boolean,false) is not true then raise exception 'Checklist harga belum lengkap'; end if;
  end loop;
  select coalesce(max(version_number),0)+1,max(quoted_total) filter(where status in ('locked','sent')) into next_version,previous_total from public.custom_order_quotation_versions where order_id=p_order_id;
  update public.custom_order_quotation_versions set status='superseded' where order_id=p_order_id and status='sent';
  select coalesce(jsonb_agg(jsonb_build_object('upload_id',id,'design_version',design_version,'design_stage',design_stage) order by design_version),'[]'::jsonb) into design_snapshot from public.customer_uploads where linked_order_id=p_order_id and status='linked';
  insert into public.custom_order_quotation_versions(order_id,version_number,status,previous_total,quoted_total,pricing_components,review_checklist,design_version_snapshot,valid_until,sent_by)
  values(p_order_id,next_version,'sent',previous_total,order_row.total_amount,order_row.custom_project_snapshot,p_checklist,design_snapshot,now()+make_interval(days=>p_valid_days),auth.uid()) returning * into result_row;
  update public.orders set custom_quote_version=next_version,custom_quote_status='sent',custom_quote_locked_at=null,custom_quote_locked_total=null,final_total_approved_at=null,status='awaiting_customer_approval',payment_required_amount=0,payment_balance=0,updated_by=auth.uid(),updated_at=now() where id=p_order_id;
  insert into public.order_status_history(order_id,from_status,to_status,note,changed_by) values(p_order_id,order_row.status,'awaiting_customer_approval','Penawaran Custom versi '||next_version||' dikirim kepada pelanggan.',auth.uid());
  return result_row;
end $$;

create or replace function public.decide_public_custom_order_quotation_v1(p_access_token_hash text,p_decision text,p_acknowledgement text,p_reason text default null)
returns public.orders language plpgsql security definer set search_path='' as $$
declare order_row public.orders; version_row public.custom_order_quotation_versions; next_status text;
begin
  if p_decision not in ('approve','revision_requested') then raise exception 'Keputusan tidak valid'; end if;
  select * into order_row from public.orders where public_access_token_hash=p_access_token_hash and archived_at is null for update;
  if not found or order_row.custom_quote_status<>'sent' or order_row.status<>'awaiting_customer_approval' then raise exception 'Penawaran aktif tidak ditemukan'; end if;
  select * into version_row from public.custom_order_quotation_versions where order_id=order_row.id and version_number=order_row.custom_quote_version and status='sent' for update;
  if not found or version_row.valid_until<=now() then raise exception 'Penawaran sudah kedaluwarsa'; end if;
  if p_decision='revision_requested' then
    if length(btrim(coalesce(p_reason,'')))<5 then raise exception 'Alasan revisi wajib diisi'; end if;
    update public.custom_order_quotation_versions set status='revision_requested' where id=version_row.id;
    update public.orders set custom_quote_status='revision_requested',custom_review_completed_at=null,status='under_review',updated_at=now() where id=order_row.id returning * into order_row;
    insert into public.order_status_history(order_id,from_status,to_status,note) values(order_row.id,'awaiting_customer_approval','under_review','Pelanggan meminta revisi penawaran v'||version_row.version_number||': '||left(btrim(p_reason),500));
  else
    if length(btrim(coalesce(p_acknowledgement,'')))<8 then raise exception 'Persetujuan pelanggan belum lengkap'; end if;
    update public.custom_order_quotation_versions set status='locked',locked_at=now() where id=version_row.id;
    insert into public.custom_order_customer_approvals(order_id,quotation_version_id,quotation_version,approved_total,design_version_snapshot,access_token_hash,acknowledgement)
    values(order_row.id,version_row.id,version_row.version_number,version_row.quoted_total,version_row.design_version_snapshot,p_access_token_hash,left(btrim(p_acknowledgement),500));
    next_status:=case when order_row.payment_method='pay_at_store' then 'processing' else 'awaiting_payment' end;
    update public.orders set custom_quote_status='locked',custom_quote_locked_at=now(),custom_quote_locked_total=version_row.quoted_total,final_total_approved_at=now(),total_amount=version_row.quoted_total,payment_required_amount=version_row.quoted_total,payment_balance=greatest(version_row.quoted_total-coalesce(payment_effective_total,0),0),status=next_status,updated_at=now() where id=order_row.id returning * into order_row;
    insert into public.order_status_history(order_id,from_status,to_status,note) values(order_row.id,'awaiting_customer_approval',next_status,'Pelanggan menyetujui dan mengunci penawaran Custom v'||version_row.version_number||'.');
  end if;
  insert into public.system_audit_log(entity_type,entity_id,action,actor_role,source,reason,new_value) values('order',order_row.id,'custom_quotation_'||p_decision,'customer','custom_order_revision',nullif(btrim(coalesce(p_reason,'')),''),jsonb_build_object('version',version_row.version_number,'total',version_row.quoted_total));
  return order_row;
end $$;

create or replace function public.guard_custom_order_price_lock_v1()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if jsonb_array_length(coalesce(new.custom_project_snapshot,'[]'::jsonb))=0 then return new; end if;
  if new.whatsapp_confirmed_at is not null and new.custom_quote_locked_at is null and new.status in ('awaiting_payment','processing') then
    new.status:='under_review';
    new.payment_required_amount:=0;
    new.payment_balance:=0;
  end if;
  if old.custom_quote_locked_at is not null and new.total_amount is distinct from old.total_amount and new.custom_quote_version is not distinct from old.custom_quote_version then
    raise exception 'Total Custom yang terkunci tidak boleh diubah tanpa versi baru';
  end if;
  return new;
end $$;
drop trigger if exists guard_custom_order_price_lock_v1 on public.orders;
create trigger guard_custom_order_price_lock_v1 before update on public.orders for each row execute function public.guard_custom_order_price_lock_v1();

revoke all on function public.start_custom_order_review_v1(uuid,timestamptz) from public,anon;
revoke all on function public.approve_custom_order_review_v1(uuid,jsonb,text,timestamptz) from public,anon;
revoke all on function public.send_custom_order_quotation_v1(uuid,jsonb,integer,timestamptz) from public,anon;
revoke all on function public.decide_public_custom_order_quotation_v1(text,text,text,text) from public,anon,authenticated;
revoke all on function public.guard_custom_order_price_lock_v1() from public,anon,authenticated;
grant execute on function public.start_custom_order_review_v1(uuid,timestamptz) to authenticated,service_role;
grant execute on function public.approve_custom_order_review_v1(uuid,jsonb,text,timestamptz) to authenticated,service_role;
grant execute on function public.send_custom_order_quotation_v1(uuid,jsonb,integer,timestamptz) to authenticated,service_role;
grant execute on function public.decide_public_custom_order_quotation_v1(text,text,text,text) to service_role;

commit;

-- VERIFICATION (owner Preview):
-- select level,count(*) from public.indonesia_regions where is_active group by level order by level;
-- select order_id,province_id,regency_id,district_id,village_id,postal_code from public.order_address_snapshots order by created_at desc limit 10;
-- select id,status,final_verified_at,final_verified_by from public.fulfillments where final_verified_at is not null order by final_verified_at desc limit 10;
-- select design_stage,design_version,count(*) from public.customer_uploads group by design_stage,design_version order by design_stage,design_version;

-- ROLLBACK (owner-run only after application rollback): drop the guard trigger,
-- the three new RPC/helper functions and the 14-argument checkout overload;
-- remove final-verification columns, upload version columns, address snapshots,
-- and region catalog only after preserving required history. Never delete order,
-- payment, fulfillment, customer upload, PIM, Jersey, or Phase 7 history.
