begin;

-- DEBRODER Order Integrity & Handoff Foundation v1.0 — Phase 0-3
-- Forward-only and additive. Historical rows are audited, never rewritten here.

insert into public.permission_definitions(permission_key, module, label, description)
values
  ('order.task.read', 'order', 'Lihat tugas pesanan', 'Melihat task ledger operasional pesanan.'),
  ('order.task.manage', 'order', 'Kelola tugas pesanan', 'Mengakui, mengambil, menugaskan, memblokir, dan menyelesaikan tugas pesanan.'),
  ('order.integrity.read', 'order', 'Lihat integritas pesanan', 'Melihat temuan konsistensi order, pembayaran, produksi, dan fulfillment.')
on conflict (permission_key) do update
set module = excluded.module,
    label = excluded.label,
    description = excluded.description;

insert into public.role_permissions(role, permission_key, granted, updated_by, updated_at)
select rp.role, 'order.task.read', bool_or(rp.granted), null, now()
from public.role_permissions rp
where rp.permission_key = 'order.read'
group by rp.role
on conflict (role, permission_key) do update
set granted = excluded.granted, updated_by = null, updated_at = now();

insert into public.role_permissions(role, permission_key, granted, updated_by, updated_at)
select rp.role, 'order.integrity.read', bool_or(rp.granted), null, now()
from public.role_permissions rp
where rp.permission_key = 'order.read'
group by rp.role
on conflict (role, permission_key) do update
set granted = excluded.granted, updated_by = null, updated_at = now();

insert into public.role_permissions(role, permission_key, granted, updated_by, updated_at)
select rp.role, 'order.task.manage', bool_or(rp.granted), null, now()
from public.role_permissions rp
where rp.permission_key = 'order.edit'
group by rp.role
on conflict (role, permission_key) do update
set granted = excluded.granted, updated_by = null, updated_at = now();

-- Finance must be able to work payment-review tasks without receiving general order.edit.
insert into public.role_permissions(role, permission_key, granted, updated_by, updated_at)
select rp.role, 'order.task.manage', bool_or(rp.granted), null, now()
from public.role_permissions rp
where rp.permission_key = 'payment.verify'
group by rp.role
on conflict (role, permission_key) do update
set granted = public.role_permissions.granted or excluded.granted,
    updated_by = null,
    updated_at = now();

insert into public.role_permissions(role, permission_key, granted, updated_by, updated_at)
values
  ('sales_admin','order.task.manage',true,null,now()),
  ('production_admin','order.task.manage',true,null,now()),
  ('quality_control','order.task.manage',true,null,now()),
  ('store_staff','order.task.manage',true,null,now())
on conflict (role, permission_key) do update
set granted = excluded.granted, updated_by = null, updated_at = now();

create table if not exists public.order_integrity_findings (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  code text not null,
  severity text not null check (severity in ('warning', 'critical')),
  hard_block boolean not null default false,
  status text not null default 'open' check (status in ('open', 'resolved', 'ignored')),
  message text not null,
  details jsonb not null default '{}'::jsonb,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null,
  resolution_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(order_id, code)
);

create index if not exists order_integrity_findings_open_idx
  on public.order_integrity_findings(order_id, severity, last_seen_at desc)
  where status = 'open';

create table if not exists public.order_tasks (
  id uuid primary key default gen_random_uuid(),
  task_key text not null unique,
  order_id uuid not null references public.orders(id) on delete restrict,
  task_type text not null check (task_type in (
    'review_new_order', 'review_custom_order', 'set_shipping_quote',
    'prepare_custom_quote', 'review_payment', 'resolve_payment_correction',
    'create_job_order', 'prepare_ready_stock', 'run_production',
    'run_quality_control', 'pack_order', 'run_final_check',
    'dispatch_shipping', 'handover_pickup', 'resolve_integrity'
  )),
  status text not null default 'open' check (status in (
    'open', 'acknowledged', 'in_progress', 'blocked', 'resolved', 'cancelled'
  )),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  assigned_role text,
  assigned_to uuid references public.profiles(id) on delete set null,
  source_event_id uuid references public.notification_events(id) on delete set null,
  title text not null,
  description text not null default '',
  related_path text,
  stage_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  due_at timestamptz,
  acknowledged_at timestamptz,
  acknowledged_by uuid references auth.users(id) on delete set null,
  started_at timestamptz,
  blocked_at timestamptz,
  blocked_reason text,
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null,
  resolution text,
  escalated_at timestamptz,
  archived_at timestamptz,
  archived_by uuid references auth.users(id) on delete set null,
  archive_reason text,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

create index if not exists order_tasks_active_queue_idx
  on public.order_tasks(status, priority, due_at, created_at)
  where archived_at is null and status in ('open', 'acknowledged', 'in_progress', 'blocked');
create index if not exists order_tasks_order_idx
  on public.order_tasks(order_id, created_at desc);
create index if not exists order_tasks_assignee_idx
  on public.order_tasks(assigned_to, status, due_at)
  where archived_at is null;

create table if not exists public.order_task_history (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.order_tasks(id) on delete restrict,
  order_id uuid not null references public.orders(id) on delete restrict,
  action text not null,
  old_value jsonb,
  new_value jsonb,
  actor_id uuid references auth.users(id) on delete set null,
  actor_role text,
  created_at timestamptz not null default now()
);

create index if not exists order_task_history_task_idx
  on public.order_task_history(task_id, created_at desc);

alter table public.order_integrity_findings enable row level security;
alter table public.order_tasks enable row level security;
alter table public.order_task_history enable row level security;

revoke all on public.order_integrity_findings from public, anon, authenticated;
revoke all on public.order_tasks from public, anon, authenticated;
revoke all on public.order_task_history from public, anon, authenticated;
grant select on public.order_integrity_findings to authenticated;
grant select on public.order_tasks to authenticated;
grant select on public.order_task_history to authenticated;
grant all on public.order_integrity_findings to service_role;
grant all on public.order_tasks to service_role;
grant all on public.order_task_history to service_role;

create policy "order integrity readable by permitted staff"
  on public.order_integrity_findings for select to authenticated
  using (public.has_permission('order.integrity.read'));
create policy "order tasks readable by permitted staff"
  on public.order_tasks for select to authenticated
  using (public.has_permission('order.task.read'));
create policy "order task history readable by permitted staff"
  on public.order_task_history for select to authenticated
  using (public.has_permission('order.task.read'));

create or replace function public._evaluate_order_integrity_v1(p_order_id uuid)
returns table(code text, severity text, hard_block boolean, message text, details jsonb)
language plpgsql
security definer
set search_path = ''
as $$
declare
  o public.orders;
  f public.fulfillments;
  j public.job_orders;
  pending_payments integer := 0;
  verified_payments integer := 0;
  invalid_verified_payments integer := 0;
  active_reservations integer := 0;
  live_links integer := 0;
  is_custom boolean := false;
begin
  select * into o from public.orders where id = p_order_id;
  if not found then return; end if;

  is_custom := jsonb_typeof(o.custom_project_snapshot) = 'array'
    and jsonb_array_length(o.custom_project_snapshot) > 0;

  select * into f from public.fulfillments
  where order_id = p_order_id and archived_at is null and status <> 'cancelled'
  order by created_at desc limit 1;

  select * into j from public.job_orders
  where order_id = p_order_id and archived_at is null
  order by created_at desc limit 1;

  select count(*) filter (where status = 'pending'),
         count(*) filter (where status = 'verified')
    into pending_payments, verified_payments
  from public.order_payments
  where order_id = p_order_id and archived_at is null;

  select count(*) into invalid_verified_payments
  from public.order_payments
  where order_id = p_order_id and archived_at is null and status = 'verified'
    and (
      verified_at is null or verified_by is null or reviewed_at is null or reviewed_by is null
      or verified_amount is null or verified_amount <= 0 or verified_transaction_at is null
      or nullif(btrim(coalesce(verified_destination_account,'')),'') is null
      or nullif(btrim(coalesce(verified_reference,'')),'') is null
      or check_funds_received is not true or check_destination_account is not true
      or check_amount is not true or check_transaction_time is not true
      or check_reference_unique is not true
    );

  select count(*) into active_reservations
  from public.stock_reservations
  where order_id = p_order_id and status = 'active' and expires_at <= now();

  select count(*) into live_links
  from public.payment_submission_links
  where order_id = p_order_id and revoked_at is null and archived_at is null
    and expires_at > now() and used_count < max_uses;

  if o.status in ('cancelled','dibatalkan','expired') and pending_payments > 0 then
    return query select 'terminal_pending_payment', 'critical', false,
      'Pesanan terminal masih memiliki pembayaran yang menunggu pemeriksaan.',
      jsonb_build_object('order_status',o.status,'pending_payments',pending_payments);
  end if;

  if invalid_verified_payments > 0 then
    return query select 'verified_payment_missing_evidence', 'critical', true,
      'Pembayaran terverifikasi tidak memiliki checklist dan data mutasi lengkap.',
      jsonb_build_object('count',invalid_verified_payments);
  end if;

  if f.id is not null
     and f.status in ('packing','ready_to_ship','ready_for_pickup','shipped','in_transit','delivered','picked_up')
     and not o.payment_production_eligible
     and not (o.payment_method='pay_at_store' and f.method='pickup') then
    return query select 'fulfillment_before_payment', 'critical', true,
      'Fulfillment berjalan sebelum prasyarat pembayaran terpenuhi.',
      jsonb_build_object('fulfillment_id',f.id,'fulfillment_status',f.status,'payment_method',o.payment_method);
  end if;

  if f.id is not null
     and f.status in ('ready_to_ship','ready_for_pickup','shipped','in_transit','delivered','picked_up')
     and f.final_verified_at is null then
    return query select 'handover_without_final_check', 'critical', true,
      'Fulfillment mencapai tahap penyerahan tanpa bukti pengecekan akhir.',
      jsonb_build_object('fulfillment_id',f.id,'fulfillment_status',f.status);
  end if;

  if o.status not in ('cancelled','dibatalkan','expired','awaiting_payment','processing')
     and pending_payments > 0 then
    return query select 'payment_review_order_status_mismatch', 'warning', false,
      'Pemeriksaan pembayaran aktif tetapi status order belum berada pada tahap pembayaran.',
      jsonb_build_object('order_status',o.status,'pending_payments',pending_payments);
  end if;

  if o.payment_status in ('pending_verification','menunggu_verifikasi') and pending_payments = 0 then
    return query select 'pending_payment_summary_without_record', 'warning', false,
      'Ringkasan pembayaran menunggu pemeriksaan tanpa payment record pending.',
      jsonb_build_object('payment_status',o.payment_status);
  end if;

  if o.payment_requirement_met and verified_payments = 0
     and coalesce(o.payment_effective_total,0) <= 0
     and o.payment_method <> 'pay_at_store' then
    return query select 'requirement_met_without_verified_payment', 'critical', true,
      'Syarat pembayaran terpenuhi tanpa pembayaran terverifikasi.',
      jsonb_build_object('payment_effective_total',o.payment_effective_total,'payment_method',o.payment_method);
  end if;

  if o.payment_production_eligible and not o.payment_requirement_met
     and o.payment_method <> 'pay_at_store' then
    return query select 'eligible_without_payment_requirement', 'critical', true,
      'Pesanan dapat diproses sebelum syarat pembayaran terpenuhi.',
      jsonb_build_object('payment_required_amount',o.payment_required_amount,'payment_effective_total',o.payment_effective_total);
  end if;

  if o.status in ('completed','selesai') and f.id is not null
     and f.status not in ('delivered','picked_up','cancelled') then
    return query select 'completed_with_open_fulfillment', 'critical', true,
      'Pesanan selesai tetapi fulfillment masih terbuka.',
      jsonb_build_object('fulfillment_id',f.id,'fulfillment_status',f.status);
  end if;

  if f.id is not null and f.status in ('ready_for_pickup','picked_up') and f.method <> 'pickup' then
    return query select 'pickup_method_mismatch', 'critical', true,
      'Status pickup tidak cocok dengan metode fulfillment.',
      jsonb_build_object('fulfillment_id',f.id,'method',f.method,'status',f.status);
  end if;

  if f.id is not null and f.status in ('ready_to_ship','shipped','in_transit','delivered') and f.method <> 'shipping' then
    return query select 'shipping_method_mismatch', 'critical', true,
      'Status pengiriman tidak cocok dengan metode fulfillment.',
      jsonb_build_object('fulfillment_id',f.id,'method',f.method,'status',f.status);
  end if;

  if j.id is not null and not is_custom then
    return query select 'ready_stock_has_job_order', 'critical', true,
      'Ready Stock tidak boleh mempunyai Surat Perintah Kerja produksi.',
      jsonb_build_object('job_order_id',j.id,'job_order_status',j.status);
  end if;

  if j.id is not null and j.status in ('ready','released','in_progress','production','in_production')
     and not o.payment_production_eligible then
    return query select 'custom_job_before_payment', 'critical', true,
      'Produksi Custom terbuka sebelum prasyarat pembayaran terpenuhi.',
      jsonb_build_object('job_order_id',j.id,'job_order_status',j.status);
  end if;

  if active_reservations > 0 then
    return query select 'expired_reservation_still_active', 'warning', false,
      'Reservasi stok telah kedaluwarsa tetapi masih aktif.',
      jsonb_build_object('count',active_reservations);
  end if;

  if o.status = 'awaiting_payment' and o.payment_method = 'bank_transfer' and live_links = 0 and pending_payments = 0 and verified_payments = 0 then
    return query select 'awaiting_payment_without_live_link', 'warning', false,
      'Pesanan menunggu pembayaran tanpa tautan pembayaran aktif.',
      '{}'::jsonb;
  end if;
end
$$;

revoke all on function public._evaluate_order_integrity_v1(uuid) from public, anon, authenticated;
grant execute on function public._evaluate_order_integrity_v1(uuid) to service_role;

create or replace function public.evaluate_order_integrity_v1(p_order_id uuid)
returns table(code text, severity text, hard_block boolean, message text, details jsonb)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.role() <> 'service_role' and not public.has_permission('order.integrity.read') then
    raise exception 'Tidak berwenang melihat integritas pesanan';
  end if;
  return query select * from public._evaluate_order_integrity_v1(p_order_id);
end
$$;

revoke all on function public.evaluate_order_integrity_v1(uuid) from public, anon;
grant execute on function public.evaluate_order_integrity_v1(uuid) to authenticated, service_role;

create or replace function public.refresh_order_integrity_v1(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_codes text[];
begin
  select coalesce(array_agg(e.code), array[]::text[]) into current_codes
  from public._evaluate_order_integrity_v1(p_order_id) e;

  insert into public.order_integrity_findings(
    order_id, code, severity, hard_block, status, message, details,
    first_seen_at, last_seen_at, resolved_at, resolved_by, resolution_note, updated_at
  )
  select p_order_id, e.code, e.severity, e.hard_block, 'open', e.message, e.details,
         now(), now(), null, null, null, now()
  from public._evaluate_order_integrity_v1(p_order_id) e
  on conflict (order_id, code) do update
  set severity = excluded.severity,
      hard_block = excluded.hard_block,
      status = 'open',
      message = excluded.message,
      details = excluded.details,
      last_seen_at = now(),
      resolved_at = null,
      resolved_by = null,
      resolution_note = null,
      updated_at = now();

  update public.order_integrity_findings
  set status = 'resolved', resolved_at = now(), updated_at = now(),
      resolution_note = coalesce(resolution_note, 'Kondisi tidak lagi terdeteksi oleh pemeriksaan canonical.')
  where order_id = p_order_id and status = 'open'
    and not (code = any(current_codes));
end
$$;

revoke all on function public.refresh_order_integrity_v1(uuid) from public, anon, authenticated;
grant execute on function public.refresh_order_integrity_v1(uuid) to service_role;

create or replace function public._resolve_order_active_stage_v1(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  o public.orders;
  f public.fulfillments;
  j public.job_orders;
  q public.qc_records;
  p public.order_payments;
  is_custom boolean := false;
  is_pickup boolean := false;
  is_shipping boolean := false;
  is_pay_at_store boolean := false;
  stage text := 'integrity_review';
  responsibility text := 'debroder';
  responsibility_label text := 'SEDANG DIPROSES DEBRODER';
  tone text := 'warning';
  admin_task_type text := 'resolve_integrity';
  customer_label text := 'Status Sedang Diperbarui';
  admin_label text := 'Periksa Integritas Pesanan';
  customer_title text := 'Status pesanan sedang diperbarui';
  customer_description text := 'Pesanan tetap tersimpan. Tim DEBRODER sedang memperbarui tahap operasionalnya.';
  primary_action text := 'review_order';
  secondary_action text := 'track';
  previous_stage text := 'Pesanan Diterima';
  next_stage text := 'Tahap Berikutnya';
  next_step text := 'Periksa kembali halaman pelacakan untuk pembaruan terbaru.';
  blocking_reason text := 'Kombinasi status belum dapat dipetakan dengan aman.';
  terminal boolean := false;
  warning_text text;
  warnings_json jsonb := '[]'::jsonb;
  hard_block_issue boolean := false;
  revision text := 'current';
begin
  select * into o from public.orders where id = p_order_id;
  if not found then raise exception 'Pesanan tidak ditemukan'; end if;

  is_custom := jsonb_typeof(o.custom_project_snapshot) = 'array'
    and jsonb_array_length(o.custom_project_snapshot) > 0;
  is_pickup := o.delivery_method = 'pickup';
  is_shipping := o.delivery_method in ('shipping','delivery');
  is_pay_at_store := o.payment_method = 'pay_at_store';
  revision := coalesce(o.custom_quote_version::text, 'current');

  select * into p from public.order_payments
  where order_id = p_order_id and archived_at is null
  order by created_at desc limit 1;
  select * into f from public.fulfillments
  where order_id = p_order_id and archived_at is null and status <> 'cancelled'
  order by created_at desc limit 1;
  select * into j from public.job_orders
  where order_id = p_order_id and archived_at is null
  order by created_at desc limit 1;
  if j.id is not null then
    select * into q from public.qc_records
    where job_order_id = j.id and archived_at is null
    order by created_at desc limit 1;
  end if;

  select
    (array_agg(e.message order by case e.severity when 'critical' then 0 else 1 end, e.code))[1],
    coalesce(jsonb_agg(e.message order by case e.severity when 'critical' then 0 else 1 end, e.code), '[]'::jsonb),
    coalesce(bool_or(e.hard_block), false)
  into warning_text, warnings_json, hard_block_issue
  from public._evaluate_order_integrity_v1(p_order_id) e;

  -- Terminal state is always customer-canonical. Contradictory child records
  -- create an integrity task but never silently reopen a completed order.
  if o.status in ('completed','selesai') or f.status in ('delivered','picked_up') then
    stage := 'completed'; responsibility := 'none'; responsibility_label := 'TIDAK ADA TINDAKAN YANG DIPERLUKAN';
    tone := 'success'; admin_task_type := case when warning_text is null then null else 'resolve_integrity' end;
    customer_label := 'Selesai'; admin_label := 'Pesanan Selesai'; customer_title := 'Pesanan selesai';
    customer_description := case when is_pickup
      then 'Barang telah diserahkan. Simpan nomor pesanan untuk kebutuhan layanan setelah pembelian.'
      else 'Pesanan telah diterima. Simpan nomor pesanan untuk kebutuhan layanan setelah pembelian.' end;
    primary_action := case when warning_text is null then 'track_only' else 'review_order' end;
    previous_stage := case when is_pickup then 'Serah Terima' else 'Pengiriman' end;
    next_stage := 'Layanan Setelah Pembelian'; next_step := 'Tidak ada tindakan pelanggan yang diperlukan.';
    blocking_reason := null; terminal := true;

  elsif o.status in ('cancelled','dibatalkan','expired') then
    stage := case when o.status='expired' then 'expired' else 'cancelled' end;
    responsibility := 'customer'; responsibility_label := 'TINDAKAN ANDA'; tone := 'warning';
    admin_task_type := case when warning_text is null then null else 'resolve_integrity' end;
    customer_label := case when o.status='expired' then 'Kedaluwarsa' else 'Dibatalkan' end;
    admin_label := case when o.status='expired' then 'Pesanan Kedaluwarsa' else 'Pesanan Dibatalkan' end;
    customer_title := case when o.status='expired' then 'Masa pesanan telah berakhir' else 'Pesanan tidak aktif' end;
    customer_description := 'Hubungi Admin DEBRODER bila Anda masih ingin melanjutkan atau membuat pesanan baru.';
    primary_action := 'contact_admin'; previous_stage := 'Pesanan Dibuat'; next_stage := 'Hubungi Admin';
    next_step := 'Admin akan membantu memeriksa pilihan yang masih tersedia.';
    blocking_reason := case when o.status='expired' then 'Masa berlaku pesanan telah berakhir.' else 'Pesanan telah dibatalkan.' end;
    terminal := true;

  -- A hard invariant issue blocks further operational interpretation until
  -- an authorized Admin reviews the inconsistency.
  elsif hard_block_issue then
    stage := 'integrity_review'; responsibility := 'debroder'; responsibility_label := 'SEDANG DIPROSES DEBRODER';
    tone := 'warning'; admin_task_type := 'resolve_integrity'; customer_label := 'Status Sedang Diperbarui';
    admin_label := 'Periksa Integritas Pesanan'; customer_title := 'Status pesanan sedang diperbarui';
    customer_description := 'Pesanan tetap tersimpan. Tim DEBRODER sedang memeriksa konsistensi tahap operasionalnya.';
    primary_action := 'review_order'; previous_stage := 'Pesanan Tercatat'; next_stage := 'Tahap Aman Berikutnya';
    next_step := 'Proses dilanjutkan setelah kondisi pesanan dinyatakan konsisten.';
    blocking_reason := warning_text;

  -- Concrete valid fulfillment facts outrank stale order/payment summaries.
  elsif f.status = 'ready_for_pickup' then
    stage := 'ready_for_pickup'; responsibility := 'customer'; responsibility_label := 'TINDAKAN ANDA'; tone := 'action';
    admin_task_type := 'handover_pickup'; customer_label := 'Barang Siap Diambil'; admin_label := 'Menunggu Serah Terima';
    customer_title := case when is_pay_at_store then 'Barang siap diambil dan dibayar di toko' else 'Barang siap diambil' end;
    customer_description := 'Hubungi Admin sebelum berangkat dan tunjukkan nomor pesanan saat tiba di toko.';
    primary_action := 'handover_pickup'; previous_stage := 'Pengecekan Akhir'; next_stage := 'Serah Terima';
    next_step := case when is_pay_at_store
      then 'Pembayaran dikonfirmasi oleh Admin saat barang diserahkan.'
      else 'Setelah barang diserahkan, pesanan akan ditandai selesai.' end;
    blocking_reason := null; revision := f.id::text;

  elsif f.status in ('ready_to_ship','shipped','in_transit') then
    stage := case when f.status='ready_to_ship' then 'ready_to_ship' else 'shipping' end;
    responsibility := case when f.status='ready_to_ship' then 'debroder' else 'none' end;
    responsibility_label := case when f.status='ready_to_ship' then 'SEDANG DIPROSES DEBRODER' else 'TIDAK ADA TINDAKAN YANG DIPERLUKAN' end;
    tone := 'processing'; admin_task_type := case when f.status='ready_to_ship' then 'dispatch_shipping' else null end;
    customer_label := case when f.status='ready_to_ship' then 'Siap Dikirim' else 'Sedang Dikirim' end;
    admin_label := case when f.status='ready_to_ship' then 'Serahkan ke Kurir' else 'Pengiriman Berjalan' end;
    customer_title := case when f.status='ready_to_ship' then 'Pesanan siap dikirim' else 'Pesanan sedang dikirim' end;
    customer_description := case when f.status='ready_to_ship'
      then 'Paket telah melalui pengecekan akhir dan menunggu diserahkan kepada kurir.'
      else 'Paket sudah diserahkan kepada kurir dan sedang menuju alamat penerima.' end;
    primary_action := case when f.status='ready_to_ship' then 'dispatch_order' else 'track_only' end;
    previous_stage := 'Pengecekan Akhir'; next_stage := case when f.status='ready_to_ship' then 'Pengiriman' else 'Pesanan Diterima' end;
    next_step := case when f.tracking_number is not null then 'Gunakan nomor resi untuk memantau paket sampai diterima.' else 'Nomor resi akan tampil setelah tersedia.' end;
    blocking_reason := null; revision := f.id::text;

  elsif f.status = 'packing' then
    stage := case when f.final_verified_at is null then 'final_check' else 'final_check_completed' end;
    responsibility := 'debroder'; responsibility_label := 'SEDANG DIPROSES DEBRODER'; tone := 'processing';
    admin_task_type := 'run_final_check';
    customer_label := case when f.final_verified_at is null then 'Pengecekan Akhir' else 'Pengecekan Akhir Selesai' end;
    admin_label := case when f.final_verified_at is null then 'Lakukan Pengecekan Akhir'
      when f.method='pickup' then 'Tandai Barang Siap Diambil' else 'Tandai Pesanan Siap Dikirim' end;
    customer_title := case when f.final_verified_at is null then 'Pesanan sedang melalui pengecekan akhir' else 'Pengecekan akhir selesai' end;
    customer_description := case when f.final_verified_at is null
      then 'Tim DEBRODER sedang mencocokkan produk, jumlah, penerima, dan kondisi paket sebelum penyerahan.'
      else 'Paket telah diperiksa dan sedang disiapkan untuk tahap penyerahan.' end;
    primary_action := 'run_final_check'; previous_stage := 'Pengemasan';
    next_stage := case when f.method='pickup' then 'Siap Diambil' else 'Siap Dikirim' end;
    next_step := case when f.final_verified_at is null
      then 'Setelah checklist lengkap, pesanan dapat masuk ke tahap penyerahan.'
      when f.method='pickup' then 'Admin akan mengubah status menjadi siap diambil.'
      else 'Admin akan mengubah status menjadi siap dikirim.' end;
    blocking_reason := case when f.final_verified_at is null then 'Checklist pengecekan akhir belum selesai.' else 'Status penyerahan belum diperbarui.' end;
    revision := f.id::text;

  elsif o.status in ('ready_for_production','in_production','production','proses_produksi','masuk_produksi')
     or j.status in ('ready','released','in_progress','started','production','in_production') then
    stage := 'production'; responsibility := 'debroder'; responsibility_label := 'SEDANG DIPROSES DEBRODER'; tone := 'processing';
    admin_task_type := 'run_production'; customer_label := 'Produksi'; admin_label := 'Produksi Berjalan';
    customer_title := 'Pesanan sedang diproduksi'; customer_description := 'Tim produksi sedang mengerjakan pesanan berdasarkan spesifikasi yang telah disetujui.';
    primary_action := 'run_production'; previous_stage := 'Surat Perintah Kerja'; next_stage := 'Pemeriksaan Kualitas';
    next_step := 'Hasil produksi akan masuk ke pemeriksaan kualitas.'; blocking_reason := null;
    revision := coalesce(j.id::text,revision);

  elsif o.status in ('quality_control','quality_check')
     or (is_custom and j.status in ('completed','done') and (q.id is null or not (q.status='finalized' and q.result='passed'))) then
    stage := 'quality_control'; responsibility := 'debroder'; responsibility_label := 'SEDANG DIPROSES DEBRODER'; tone := 'processing';
    admin_task_type := 'run_quality_control'; customer_label := 'Pemeriksaan Kualitas'; admin_label := 'Lakukan Pemeriksaan Kualitas';
    customer_title := 'Pemeriksaan kualitas'; customer_description := 'Tim DEBRODER sedang memastikan hasil sesuai spesifikasi pesanan.';
    primary_action := 'run_quality_control'; previous_stage := case when is_custom then 'Produksi' else 'Persiapan Barang' end;
    next_stage := 'Pengemasan'; next_step := 'Pesanan akan dikemas setelah lulus pemeriksaan kualitas.';
    blocking_reason := null; revision := coalesce(q.id::text,j.id::text,revision);

  -- Payment verification is a server fact. Proof submission alone never enters
  -- post-payment work.
  elsif o.payment_requirement_met or o.payment_status in ('paid','verified','terverifikasi') then
    responsibility := 'debroder'; responsibility_label := 'SEDANG DIPROSES DEBRODER'; tone := 'processing'; blocking_reason := null;
    if is_custom and (j.id is null or j.status='draft') then
      stage := 'job_order_required'; admin_task_type := 'create_job_order'; customer_label := 'Pembayaran Terverifikasi';
      admin_label := 'Buat Surat Perintah Kerja'; customer_title := 'Pembayaran terverifikasi';
      customer_description := 'Dana sudah dikonfirmasi. Tim DEBRODER sedang menyiapkan Surat Perintah Kerja.';
      primary_action := 'create_job_order'; previous_stage := 'Pembayaran Terverifikasi'; next_stage := 'Produksi';
      next_step := 'Pesanan akan masuk ke produksi setelah Surat Perintah Kerja diterbitkan.';
    elsif is_custom and j.status in ('completed','done') and q.status='finalized' and q.result='passed' then
      stage := 'packing'; admin_task_type := 'pack_order'; customer_label := 'Pengemasan'; admin_label := 'Siapkan Pengemasan';
      customer_title := 'Pesanan siap dikemas'; customer_description := 'Produksi dan pemeriksaan kualitas selesai. Tim DEBRODER sedang menyiapkan pengemasan.';
      primary_action := 'pack_order'; previous_stage := 'Pemeriksaan Kualitas'; next_stage := 'Pengecekan Akhir';
      next_step := 'Setelah dikemas, pesanan masuk ke pengecekan akhir.'; revision := coalesce(f.id::text,j.id::text,revision);
    else
      stage := 'preparing_goods'; admin_task_type := 'prepare_ready_stock'; customer_label := 'Persiapan Barang'; admin_label := 'Siapkan Barang';
      customer_title := 'Barang sedang disiapkan'; customer_description := 'Tim DEBRODER sedang memastikan produk, warna, ukuran, jumlah, dan kondisi barang.';
      primary_action := 'prepare_goods'; previous_stage := 'Pembayaran Terverifikasi';
      next_stage := case when is_pickup then 'Siap Diambil' else 'Pemeriksaan Barang' end;
      next_step := case when is_pickup then 'Barang akan dinyatakan siap setelah pemeriksaan selesai.' else 'Barang akan diperiksa sebelum dikemas.' end;
      revision := coalesce(f.id::text,revision);
    end if;

  elsif coalesce(p.status,'') = 'pending' or o.payment_status in ('pending_verification','menunggu_verifikasi') then
    stage := 'payment_review'; responsibility := 'debroder'; responsibility_label := 'SEDANG DIPROSES DEBRODER'; tone := 'processing';
    admin_task_type := 'review_payment'; customer_label := 'Pembayaran Sedang Diperiksa'; admin_label := 'Periksa Pembayaran';
    customer_title := 'Pembayaran sedang diperiksa'; customer_description := 'Bukti sudah diterima. Admin sedang mencocokkannya dengan mutasi rekening DEBRODER.';
    primary_action := 'review_payment'; previous_stage := 'Bukti Pembayaran Dikirim';
    next_stage := case when is_custom then 'Surat Perintah Kerja' else 'Persiapan Barang' end;
    next_step := case when is_custom
      then 'Setelah dana ditemukan, pesanan masuk ke Surat Perintah Kerja.'
      else 'Setelah dana ditemukan, pesanan masuk ke Persiapan Barang.' end;
    blocking_reason := 'Bukti pembayaran belum menjadi konfirmasi dana masuk.';
    revision := coalesce(p.id::text,revision);

  elsif coalesce(p.review_outcome,'') in ('funds_not_found','correction_required','rejected','proof_unclear')
     or o.payment_status in ('rejected','ditolak') then
    stage := 'payment_correction'; responsibility := 'customer'; responsibility_label := 'TINDAKAN ANDA'; tone := 'warning';
    admin_task_type := null; customer_label := 'Perbaiki Pembayaran'; admin_label := 'Menunggu Perbaikan Pelanggan';
    customer_title := 'Pembayaran perlu diperbaiki'; customer_description := 'Periksa catatan Admin, lalu kirim kembali laporan pembayaran melalui pesanan yang sama.';
    primary_action := 'resubmit_payment'; previous_stage := 'Pemeriksaan Pembayaran'; next_stage := 'Pemeriksaan Ulang';
    next_step := 'Bukti baru akan diperiksa kembali melalui mutasi rekening.';
    blocking_reason := 'Data atau bukti pembayaran belum dapat diverifikasi.';
    revision := coalesce(p.id::text,revision);

  elsif o.payment_status = 'partially_paid' then
    stage := 'payment_balance_due'; responsibility := 'customer'; responsibility_label := 'TINDAKAN ANDA'; tone := 'action';
    admin_task_type := null; customer_label := 'Sisa Pembayaran'; admin_label := 'Menunggu Sisa Pembayaran';
    customer_title := 'Selesaikan sisa pembayaran'; customer_description := 'Sebagian pembayaran sudah terverifikasi. Bayar sisa tagihan melalui tautan pesanan yang sama.';
    primary_action := 'open_payment'; previous_stage := 'Pembayaran Sebagian';
    next_stage := case when is_custom then 'Surat Perintah Kerja' else 'Persiapan Barang' end;
    next_step := 'Setelah syarat pembayaran terpenuhi, pesanan dapat dilanjutkan.';
    blocking_reason := 'Syarat pembayaran belum terpenuhi.';

  elsif o.status='awaiting_payment' and not is_pay_at_store then
    stage := 'payment_pending'; responsibility := 'customer'; responsibility_label := 'TINDAKAN ANDA'; tone := 'action';
    customer_label := 'Menunggu Pembayaran'; previous_stage := case when is_custom then 'Penawaran Disetujui' else 'Pesanan Dikonfirmasi' end;
    next_stage := 'Pemeriksaan Pembayaran'; next_step := 'Setelah bukti dikirim, Admin akan memeriksa mutasi rekening.';
    if warning_text is not null then
      admin_task_type := 'resolve_integrity'; admin_label := 'Siapkan Instruksi Pembayaran'; customer_title := 'Instruksi pembayaran sedang disiapkan';
      customer_description := 'Pesanan tetap tersimpan. Hubungi Admin bila instruksi belum tersedia.';
      primary_action := 'contact_admin'; blocking_reason := warning_text;
    else
      admin_task_type := null; admin_label := 'Menunggu Pembayaran Pelanggan'; customer_title := 'Selesaikan pembayaran';
      customer_description := 'Buka instruksi pembayaran, transfer sesuai total tagihan, lalu unggah bukti.';
      primary_action := 'open_payment'; blocking_reason := null;
    end if;

  elsif o.status='awaiting_customer_approval' then
    stage := 'customer_approval'; responsibility := 'customer'; responsibility_label := 'TINDAKAN ANDA'; tone := 'action';
    admin_task_type := null; customer_label := 'Menunggu Persetujuan Anda'; admin_label := 'Menunggu Persetujuan Pelanggan';
    customer_title := case when is_custom then 'Periksa dan setujui penawaran' else 'Periksa dan setujui total pesanan' end;
    customer_description := case when is_custom
      then 'Pastikan produk, layanan, desain, jumlah, dan total penawaran sudah sesuai.'
      else 'Pastikan ongkir, layanan pengiriman, dan total akhir sudah sesuai.' end;
    primary_action := case when is_custom then 'approve_quote' else 'approve_total' end;
    previous_stage := case when is_custom then 'Penetapan Harga' else 'Penetapan Ongkir' end;
    next_stage := 'Pembayaran'; next_step := 'Setelah disetujui, instruksi pembayaran akan tersedia.';
    blocking_reason := 'Keputusan pelanggan belum diterima.';

  elsif o.status='pending_confirmation' or (o.status='baru' and o.whatsapp_confirmed_at is null) then
    stage := 'whatsapp_confirmation'; responsibility := 'customer'; responsibility_label := 'TINDAKAN ANDA'; tone := 'action';
    admin_task_type := null; customer_label := 'Verifikasi WhatsApp'; admin_label := 'Menunggu Verifikasi Pelanggan';
    customer_title := 'Verifikasi nomor WhatsApp'; customer_description := 'Konfirmasi nomor yang digunakan saat checkout agar pesanan dapat diproses dengan aman.';
    primary_action := 'verify_whatsapp'; previous_stage := 'Pesanan Dibuat'; next_stage := 'Pemeriksaan Pesanan';
    next_step := case when is_custom then 'Admin akan memeriksa pesanan custom.' else 'Stok akan diperiksa dan disimpan sementara.' end;
    blocking_reason := 'Nomor WhatsApp pelanggan belum terverifikasi.';

  elsif o.status='awaiting_shipping_quote' then
    stage := 'shipping_quote'; responsibility := 'debroder'; responsibility_label := 'SEDANG DIPROSES DEBRODER'; tone := 'processing';
    admin_task_type := 'set_shipping_quote'; customer_label := 'Ongkir Sedang Ditetapkan'; admin_label := 'Tetapkan Ongkir';
    customer_title := 'Ongkir sedang ditetapkan'; customer_description := 'Admin sedang memilih kurir, layanan, biaya, dan estimasi pengiriman.';
    primary_action := 'set_shipping_quote'; previous_stage := 'Pesanan Diterima'; next_stage := 'Persetujuan Total';
    next_step := 'Anda akan diminta memeriksa dan menyetujui total akhir.'; blocking_reason := null;

  elsif o.status in ('under_review','baru') then
    stage := case when is_custom and o.custom_quote_status='draft' then 'custom_pricing' else 'order_review' end;
    responsibility := 'debroder'; responsibility_label := 'SEDANG DIPROSES DEBRODER'; tone := 'processing';
    admin_task_type := case when is_custom and o.custom_quote_status='draft' then 'prepare_custom_quote'
                            when is_custom then 'review_custom_order' else 'review_new_order' end;
    customer_label := case when is_custom then 'Pesanan Custom Sedang Diperiksa' else 'Pesanan Sedang Diperiksa' end;
    admin_label := case when is_custom and o.custom_quote_status='draft' then 'Tetapkan Harga'
                        when is_custom then 'Periksa Pesanan Custom' else 'Periksa Pesanan Baru' end;
    customer_title := case when is_custom then 'Pesanan custom sedang diperiksa' else 'Pesanan sedang diperiksa' end;
    customer_description := case when is_custom
      then 'Admin sedang memeriksa produk, layanan, file, desain, waktu pengerjaan, dan harga.'
      else 'Admin sedang memeriksa data pesanan dan ketersediaan barang.' end;
    primary_action := case when is_custom and o.custom_quote_status='draft' then 'prepare_quote' else 'review_order' end;
    previous_stage := 'Pesanan Diterima';
    next_stage := case when is_custom then 'Penetapan Harga' when is_shipping then 'Penetapan Ongkir'
                       when is_pay_at_store then 'Persiapan Barang' else 'Pembayaran' end;
    next_step := case when is_custom then 'Berikutnya adalah penetapan harga.' else 'Berikutnya adalah konfirmasi stok dan metode penyerahan.' end;
    blocking_reason := null;

  elsif is_pay_at_store and is_pickup then
    stage := 'preparing_goods'; responsibility := 'debroder'; responsibility_label := 'SEDANG DIPROSES DEBRODER'; tone := 'processing';
    admin_task_type := 'prepare_ready_stock'; customer_label := 'Persiapan Barang'; admin_label := 'Siapkan Barang Pickup';
    customer_title := 'Barang sedang disiapkan untuk diambil'; customer_description := 'Anda belum perlu melakukan transfer. Tunggu konfirmasi barang siap sebelum datang ke toko.';
    primary_action := 'prepare_goods'; previous_stage := 'Pesanan Diterima'; next_stage := 'Siap Diambil';
    next_step := 'Pembayaran dilakukan di toko saat barang sudah siap diserahkan.'; blocking_reason := null;
  end if;

  return jsonb_build_object(
    'activeStage',stage,
    'lifecycleKind',case when is_custom then 'custom' else 'ready_stock' end,
    'responsibility',responsibility,
    'responsibilityLabel',responsibility_label,
    'tone',tone,
    'customerStatusLabel',customer_label,
    'adminStatusLabel',admin_label,
    'customerTitle',customer_title,
    'customerDescription',customer_description,
    'adminTaskType',admin_task_type,
    'primaryAction',primary_action,
    'secondaryAction',secondary_action,
    'previousStage',previous_stage,
    'nextStage',next_stage,
    'nextStep',next_step,
    'blockingReason',blocking_reason,
    'warning',warning_text,
    'warnings',warnings_json,
    'taskKey',case when admin_task_type is null then null else format('order:%s:%s:%s',o.id,admin_task_type,revision) end,
    'isTerminal',terminal,
    'orderUpdatedAt',o.updated_at
  );
end
$$;


revoke all on function public._resolve_order_active_stage_v1(uuid) from public, anon, authenticated;
grant execute on function public._resolve_order_active_stage_v1(uuid) to service_role;

create or replace function public.resolve_order_active_stage_v1(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.role() <> 'service_role' and not public.has_permission('order.read') then
    raise exception 'Tidak berwenang melihat tahap pesanan';
  end if;
  return public._resolve_order_active_stage_v1(p_order_id);
end
$$;

revoke all on function public.resolve_order_active_stage_v1(uuid) from public, anon;
grant execute on function public.resolve_order_active_stage_v1(uuid) to authenticated, service_role;

create or replace function public.capture_order_task_history_v1()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.order_task_history(task_id,order_id,action,old_value,new_value,actor_id,actor_role)
  values(
    new.id,
    new.order_id,
    case when tg_op='INSERT' then 'created' else 'updated' end,
    case when tg_op='UPDATE' then to_jsonb(old) else null end,
    to_jsonb(new),
    auth.uid(),
    public.current_actor_role()
  );
  return new;
end
$$;

revoke all on function public.capture_order_task_history_v1() from public, anon, authenticated;
grant execute on function public.capture_order_task_history_v1() to service_role;

drop trigger if exists capture_order_task_history_v1 on public.order_tasks;
create trigger capture_order_task_history_v1
after insert or update on public.order_tasks
for each row execute function public.capture_order_task_history_v1();

create or replace function public.sync_order_operational_task_v1(
  p_order_id uuid,
  p_source_event_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  stage jsonb;
  key_value text;
  type_value text;
  task_id_value uuid;
  terminal_value boolean;
  priority_value text := 'normal';
begin
  perform public.refresh_order_integrity_v1(p_order_id);
  stage := public._resolve_order_active_stage_v1(p_order_id);
  key_value := nullif(stage->>'taskKey','');
  type_value := nullif(stage->>'adminTaskType','');
  terminal_value := coalesce((stage->>'isTerminal')::boolean,false);

  if stage->>'activeStage' in ('payment_review','integrity_review') or stage->>'warning' is not null then
    priority_value := 'high';
  end if;

  update public.order_tasks
  set status = case when terminal_value then 'cancelled' else 'resolved' end,
      resolved_at = now(),
      resolved_by = auth.uid(),
      resolution = case when terminal_value then 'Order terminal; task ditutup otomatis.' else 'Tahap canonical telah berubah.' end,
      updated_at = now(),
      updated_by = auth.uid()
  where order_id = p_order_id
    and archived_at is null
    and status in ('open','acknowledged','in_progress','blocked')
    and (key_value is null or task_key <> key_value);

  if key_value is null or type_value is null then
    return null;
  end if;

  insert into public.order_tasks(
    task_key,order_id,task_type,status,priority,assigned_role,source_event_id,
    title,description,related_path,stage_snapshot,created_at,updated_at
  ) values (
    key_value,p_order_id,type_value,'open',priority_value,
    case type_value
      when 'review_new_order' then 'sales_admin'
      when 'review_custom_order' then 'sales_admin'
      when 'set_shipping_quote' then 'sales_admin'
      when 'prepare_custom_quote' then 'sales_admin'
      when 'review_payment' then 'finance'
      when 'resolve_payment_correction' then 'finance'
      when 'create_job_order' then 'production_admin'
      when 'run_production' then 'production_admin'
      when 'run_quality_control' then 'quality_control'
      when 'prepare_ready_stock' then 'store_staff'
      when 'pack_order' then 'store_staff'
      when 'run_final_check' then 'store_staff'
      when 'dispatch_shipping' then 'store_staff'
      when 'handover_pickup' then 'store_staff'
      else 'admin'
    end,
    p_source_event_id,
    stage->>'adminStatusLabel',
    coalesce(stage->>'blockingReason','Tindak lanjuti tahap aktif pesanan.'),
    format('/admin/orders/%s',p_order_id),
    stage,
    now(),now()
  )
  on conflict (task_key) do update
  set status = case when public.order_tasks.status in ('resolved','cancelled') then 'open' else public.order_tasks.status end,
      priority = excluded.priority,
      assigned_role = excluded.assigned_role,
      source_event_id = coalesce(excluded.source_event_id,public.order_tasks.source_event_id),
      title = excluded.title,
      description = excluded.description,
      related_path = excluded.related_path,
      stage_snapshot = excluded.stage_snapshot,
      resolved_at = case when public.order_tasks.status in ('resolved','cancelled') then null else public.order_tasks.resolved_at end,
      resolved_by = case when public.order_tasks.status in ('resolved','cancelled') then null else public.order_tasks.resolved_by end,
      resolution = case when public.order_tasks.status in ('resolved','cancelled') then null else public.order_tasks.resolution end,
      updated_at = now()
  returning id into task_id_value;

  return task_id_value;
end
$$;

revoke all on function public.sync_order_operational_task_v1(uuid,uuid) from public, anon, authenticated;
grant execute on function public.sync_order_operational_task_v1(uuid,uuid) to service_role;

create or replace function public.update_order_task_v1(
  p_task_id uuid,
  p_action text,
  p_assigned_to uuid default null,
  p_reason text default null
)
returns public.order_tasks
language plpgsql
security definer
set search_path = ''
as $$
declare
  row_value public.order_tasks;
  actor_role_value text;
  broad_manager boolean := false;
begin
  if not public.has_permission('order.task.manage') then
    raise exception 'Tidak berwenang mengelola tugas pesanan';
  end if;
  if p_action not in ('acknowledge','start','block','resolve','cancel','assign') then
    raise exception 'Aksi tugas tidak valid';
  end if;
  if p_action in ('block','resolve','cancel') and length(trim(coalesce(p_reason,''))) < 3 then
    raise exception 'Alasan wajib diisi';
  end if;

  select * into row_value from public.order_tasks where id=p_task_id and archived_at is null for update;
  if not found then raise exception 'Tugas tidak ditemukan'; end if;

  actor_role_value := public.current_actor_role();
  broad_manager := actor_role_value in ('owner','superadmin','super_admin','admin');
  if not broad_manager
     and row_value.assigned_role is distinct from actor_role_value
     and row_value.assigned_to is distinct from auth.uid() then
    raise exception 'Tugas berada di luar kewenangan role Anda';
  end if;
  if p_action='assign' and not broad_manager
     and (p_assigned_to is distinct from auth.uid() or row_value.assigned_role is distinct from actor_role_value) then
    raise exception 'Role operasional hanya dapat mengambil tugasnya sendiri';
  end if;

  update public.order_tasks set
    status = case p_action
      when 'acknowledge' then 'acknowledged'
      when 'start' then 'in_progress'
      when 'block' then 'blocked'
      when 'resolve' then 'resolved'
      when 'cancel' then 'cancelled'
      else status end,
    assigned_to = case when p_action='assign' then p_assigned_to when p_action='start' and assigned_to is null then auth.uid() else assigned_to end,
    acknowledged_at = case when p_action='acknowledge' then now() else acknowledged_at end,
    acknowledged_by = case when p_action='acknowledge' then auth.uid() else acknowledged_by end,
    started_at = case when p_action='start' then now() else started_at end,
    blocked_at = case when p_action='block' then now() else blocked_at end,
    blocked_reason = case when p_action='block' then trim(p_reason) when p_action in ('start','resolve') then null else blocked_reason end,
    resolved_at = case when p_action in ('resolve','cancel') then now() else resolved_at end,
    resolved_by = case when p_action in ('resolve','cancel') then auth.uid() else resolved_by end,
    resolution = case when p_action in ('resolve','cancel') then trim(p_reason) else resolution end,
    updated_at = now(),
    updated_by = auth.uid()
  where id=p_task_id
  returning * into row_value;

  insert into public.system_audit_log(entity_type,entity_id,action,actor_id,actor_role,source,reason,new_value)
  values('order_task',row_value.id,'order_task_'||p_action,auth.uid(),public.current_actor_role(),'order_task_ledger',p_reason,to_jsonb(row_value));

  return row_value;
end
$$;

revoke all on function public.update_order_task_v1(uuid,text,uuid,text) from public, anon;
grant execute on function public.update_order_task_v1(uuid,text,uuid,text) to authenticated, service_role;

-- Hard guards only protect new dangerous transitions. They do not rewrite or reject
-- historical rows merely because a warning already exists.
create or replace function public.guard_fulfillment_method_invariants_v1()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  o public.orders;
begin
  if new.status in ('ready_for_pickup','picked_up') and new.method <> 'pickup' then
    raise exception 'Status pickup memerlukan metode pickup';
  end if;
  if new.status in ('ready_to_ship','shipped','in_transit','delivered') and new.method <> 'shipping' then
    raise exception 'Status pengiriman memerlukan metode shipping';
  end if;
  if new.status in ('packing','ready_for_pickup','ready_to_ship','shipped','in_transit','delivered','picked_up') then
    select * into o from public.orders where id=new.order_id for update;
    if not found then raise exception 'Pesanan tidak ditemukan'; end if;
    if not o.payment_production_eligible
       and not (o.payment_method='pay_at_store' and new.method='pickup') then
      raise exception 'Fulfillment belum boleh dilanjutkan sebelum syarat pembayaran terpenuhi';
    end if;
  end if;
  return new;
end
$$;

revoke all on function public.guard_fulfillment_method_invariants_v1() from public, anon, authenticated;
grant execute on function public.guard_fulfillment_method_invariants_v1() to service_role;

create or replace function public.guard_verified_payment_evidence_v1()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status='verified'
     and (tg_op='INSERT' or old.status is distinct from new.status) then
    if new.review_outcome <> 'verified'
       or new.verified_at is null or new.verified_by is null
       or new.reviewed_at is null or new.reviewed_by is null
       or new.verified_amount is null or new.verified_amount <= 0
       or new.verified_transaction_at is null
       or nullif(btrim(coalesce(new.verified_destination_account,'')),'') is null
       or nullif(btrim(coalesce(new.verified_reference,'')),'') is null
       or new.check_funds_received is not true
       or new.check_destination_account is not true
       or new.check_amount is not true
       or new.check_transaction_time is not true
       or new.check_reference_unique is not true then
      raise exception 'Pembayaran terverifikasi memerlukan checklist dan data mutasi lengkap';
    end if;
  end if;
  return new;
end
$$;

revoke all on function public.guard_verified_payment_evidence_v1() from public, anon, authenticated;
grant execute on function public.guard_verified_payment_evidence_v1() to service_role;

drop trigger if exists guard_verified_payment_evidence_v1 on public.order_payments;
create trigger guard_verified_payment_evidence_v1
before insert or update of status on public.order_payments
for each row execute function public.guard_verified_payment_evidence_v1();

drop trigger if exists guard_fulfillment_method_invariants_v1 on public.fulfillments;
create trigger guard_fulfillment_method_invariants_v1
before insert or update of method,status on public.fulfillments
for each row execute function public.guard_fulfillment_method_invariants_v1();

create or replace function public.guard_job_order_release_invariants_v1()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  o public.orders;
  custom_value boolean;
begin
  if new.status not in ('ready','released','in_progress','production','in_production') then return new; end if;
  select * into o from public.orders where id=new.order_id for update;
  if not found then raise exception 'Pesanan tidak ditemukan'; end if;
  custom_value := jsonb_typeof(o.custom_project_snapshot)='array' and jsonb_array_length(o.custom_project_snapshot)>0;
  if not custom_value then raise exception 'Ready Stock tidak boleh masuk proses produksi'; end if;
  if not o.payment_production_eligible then raise exception 'Produksi belum boleh dimulai sebelum syarat pembayaran terpenuhi'; end if;
  return new;
end
$$;

revoke all on function public.guard_job_order_release_invariants_v1() from public, anon, authenticated;
grant execute on function public.guard_job_order_release_invariants_v1() to service_role;

drop trigger if exists guard_job_order_release_invariants_v1 on public.job_orders;
create trigger guard_job_order_release_invariants_v1
before insert or update of status on public.job_orders
for each row execute function public.guard_job_order_release_invariants_v1();

create or replace function public.refresh_order_integrity_task_trigger_v1()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_order_id uuid;
begin
  target_order_id := case tg_table_name
    when 'orders' then new.id
    when 'order_payments' then new.order_id
    when 'fulfillments' then new.order_id
    when 'job_orders' then new.order_id
    else null end;
  if target_order_id is not null then perform public.sync_order_operational_task_v1(target_order_id,null); end if;
  return new;
end
$$;

revoke all on function public.refresh_order_integrity_task_trigger_v1() from public, anon, authenticated;
grant execute on function public.refresh_order_integrity_task_trigger_v1() to service_role;

do $$
declare t text;
begin
  foreach t in array array['orders','order_payments','fulfillments','job_orders'] loop
    execute format('drop trigger if exists refresh_order_integrity_task_v1 on public.%I',t);
    execute format('create trigger refresh_order_integrity_task_v1 after insert or update on public.%I for each row execute function public.refresh_order_integrity_task_trigger_v1()',t);
  end loop;
end
$$;

-- QC rows resolve to an order through job_orders.
create or replace function public.refresh_qc_order_integrity_task_trigger_v1()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare target_order_id uuid;
begin
  select order_id into target_order_id from public.job_orders where id=new.job_order_id;
  if target_order_id is not null then perform public.sync_order_operational_task_v1(target_order_id,null); end if;
  return new;
end
$$;

revoke all on function public.refresh_qc_order_integrity_task_trigger_v1() from public, anon, authenticated;
grant execute on function public.refresh_qc_order_integrity_task_trigger_v1() to service_role;

drop trigger if exists refresh_qc_order_integrity_task_v1 on public.qc_records;
create trigger refresh_qc_order_integrity_task_v1
after insert or update on public.qc_records
for each row execute function public.refresh_qc_order_integrity_task_trigger_v1();

-- Controlled additive backfill: only findings/tasks are created. No order/payment/
-- fulfillment values are changed and no existing notification is deleted.
do $$
declare r record;
begin
  for r in select id from public.orders where archived_at is null loop
    perform public.sync_order_operational_task_v1(r.id,null);
  end loop;
end
$$;

commit;
