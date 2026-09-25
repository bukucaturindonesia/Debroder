begin;

-- DEBRODER v1.2 Phase 5B: secure customer submissions, immutable corrections,
-- configurable payment requirements, and effective-balance history.

alter table public.orders
  add column if not exists payment_requirement_type text not null default 'full',
  add column if not exists payment_required_percentage numeric(5,2) not null default 100,
  add column if not exists payment_required_amount bigint,
  add column if not exists payment_requirement_override_reason text,
  add column if not exists payment_requirement_overridden_by uuid references auth.users(id) on delete set null,
  add column if not exists payment_requirement_overridden_at timestamptz,
  add column if not exists payment_effective_total bigint not null default 0,
  add column if not exists payment_production_eligible boolean not null default false;

alter table public.orders drop constraint if exists orders_payment_requirement_type_check;
alter table public.orders add constraint orders_payment_requirement_type_check
  check (payment_requirement_type in ('full','percentage','fixed','deposit'));
alter table public.orders drop constraint if exists orders_payment_required_percentage_check;
alter table public.orders add constraint orders_payment_required_percentage_check
  check (payment_required_percentage >= 0 and payment_required_percentage <= 100);
alter table public.orders drop constraint if exists orders_payment_required_amount_check;
alter table public.orders add constraint orders_payment_required_amount_check
  check (payment_required_amount is null or payment_required_amount >= 0);

create table if not exists public.payment_submission_links (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  token_hash text not null unique,
  expires_at timestamptz not null,
  max_uses integer not null default 1 check (max_uses > 0 and max_uses <= 20),
  used_count integer not null default 0 check (used_count >= 0 and used_count <= max_uses),
  last_submission_at timestamptz,
  revoked_at timestamptz,
  revoked_by uuid references auth.users(id) on delete set null,
  revoke_reason text,
  created_by uuid references auth.users(id) on delete set null,
  archived_at timestamptz,
  archived_by uuid references auth.users(id) on delete set null,
  archive_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payment_submission_links_hash_check check (token_hash ~ '^[0-9a-f]{64}$'),
  constraint payment_submission_links_expiry_check check (expires_at > created_at)
);

create table if not exists public.payment_adjustments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  source_payment_id uuid not null references public.order_payments(id) on delete restrict,
  adjustment_type text not null check (
    adjustment_type in ('adjustment_credit','adjustment_debit','reversal','refund','void')
  ),
  amount bigint not null check (amount > 0),
  effect_amount bigint not null check (effect_amount <> 0),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  reason text not null check (btrim(reason) <> ''),
  created_by uuid references auth.users(id) on delete set null,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  rejected_by uuid references auth.users(id) on delete set null,
  rejected_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now(),
  constraint payment_adjustments_effect_check check (
    (adjustment_type = 'adjustment_credit' and effect_amount = amount)
    or (adjustment_type in ('adjustment_debit','reversal','refund','void') and effect_amount = -amount)
  ),
  constraint payment_adjustments_decision_check check (
    (status = 'pending' and approved_at is null and rejected_at is null)
    or (status = 'approved' and approved_at is not null and approved_by is not null and rejected_at is null)
    or (status = 'rejected' and rejected_at is not null and rejected_by is not null and rejection_reason is not null)
  )
);

create table if not exists public.payment_activity_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  payment_id uuid references public.order_payments(id) on delete restrict,
  adjustment_id uuid references public.payment_adjustments(id) on delete restrict,
  action text not null,
  note text,
  actor_id uuid references auth.users(id) on delete set null,
  actor_role text,
  running_balance bigint,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (payment_id is not null or adjustment_id is not null or action like 'requirement_%')
);

alter table public.order_payments
  add column if not exists submission_link_id uuid references public.payment_submission_links(id) on delete set null,
  add column if not exists submission_idempotency_key text,
  add column if not exists submission_source text not null default 'admin';

alter table public.order_payments drop constraint if exists order_payments_submission_source_check;
alter table public.order_payments add constraint order_payments_submission_source_check
  check (submission_source in ('admin','customer_link'));

create unique index if not exists order_payments_idempotency_idx
  on public.order_payments(submission_idempotency_key)
  where submission_idempotency_key is not null;
create index if not exists payment_submission_links_order_idx
  on public.payment_submission_links(order_id, created_at desc);
create index if not exists payment_submission_links_active_idx
  on public.payment_submission_links(token_hash, expires_at)
  where revoked_at is null and archived_at is null;
create index if not exists payment_adjustments_order_idx
  on public.payment_adjustments(order_id, created_at desc);
create index if not exists payment_adjustments_source_idx
  on public.payment_adjustments(source_payment_id, status);
create index if not exists payment_activity_history_order_idx
  on public.payment_activity_history(order_id, created_at desc);

drop trigger if exists set_payment_submission_links_updated_at on public.payment_submission_links;
create trigger set_payment_submission_links_updated_at
before update on public.payment_submission_links
for each row execute function public.set_updated_at();

create or replace function public.payment_actor_role(p_actor uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select lower(role) from public.profiles where id = p_actor;
$$;

create or replace function public.payment_actor_has_role(p_actor uuid, p_roles text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.payment_actor_role(p_actor) = any(p_roles), false);
$$;

revoke all on function public.payment_actor_role(uuid) from public, anon, authenticated;
revoke all on function public.payment_actor_has_role(uuid,text[]) from public, anon, authenticated;
grant execute on function public.payment_actor_role(uuid) to service_role;
grant execute on function public.payment_actor_has_role(uuid,text[]) to service_role;

create or replace function public.refresh_order_payment_summary(p_order_id uuid)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  result_order public.orders;
  verified_total bigint;
  adjustment_total bigint;
  effective_total bigint;
  required_total bigint;
begin
  select coalesce(sum(amount),0)::bigint into verified_total
  from public.order_payments
  where order_id = p_order_id and status = 'verified' and archived_at is null;

  select coalesce(sum(effect_amount),0)::bigint into adjustment_total
  from public.payment_adjustments
  where order_id = p_order_id and status = 'approved';

  effective_total := greatest(verified_total + adjustment_total, 0);

  select case payment_requirement_type
    when 'percentage' then ceil(total_amount::numeric * payment_required_percentage / 100)::bigint
    when 'fixed' then least(coalesce(payment_required_amount,0), total_amount::bigint)
    when 'deposit' then least(coalesce(payment_required_amount,0), total_amount::bigint)
    else total_amount::bigint
  end into required_total
  from public.orders where id = p_order_id for update;

  update public.orders
  set payment_total_verified = verified_total,
      payment_effective_total = effective_total,
      payment_required_amount = required_total,
      payment_balance = greatest(total_amount::bigint - effective_total, 0),
      payment_percentage = case
        when total_amount > 0 then least(100, round((effective_total::numeric / total_amount::numeric) * 100, 2))
        else 0
      end,
      payment_requirement_met = effective_total >= required_total,
      payment_production_eligible = effective_total >= required_total,
      payment_status = case when effective_total <= 0 then 'belum_bayar' else 'terverifikasi' end,
      updated_at = now()
  where id = p_order_id
  returning * into result_order;

  return result_order;
end;
$$;

create or replace function public.submit_customer_order_payment(
  p_token_hash text,
  p_idempotency_key text,
  p_amount bigint,
  p_paid_at timestamptz,
  p_method text,
  p_channel_name text,
  p_reference_number text,
  p_customer_notes text,
  p_proof_bucket text,
  p_proof_path text,
  p_proof_file_name text,
  p_proof_mime_type text,
  p_proof_size_bytes bigint
)
returns public.order_payments
language plpgsql
security definer
set search_path = ''
as $$
declare
  link_row public.payment_submission_links;
  result_payment public.order_payments;
begin
  if p_amount is null or p_amount <= 0 then raise exception 'Nominal pembayaran harus lebih besar dari nol'; end if;
  if p_method not in ('bank_transfer','cash','qris','ewallet','other') then raise exception 'Metode pembayaran tidak valid'; end if;
  if p_proof_bucket <> 'payment-proofs' or coalesce(p_proof_path,'') = '' then raise exception 'Bukti pembayaran wajib diunggah'; end if;
  if p_proof_mime_type not in ('image/png','image/jpeg','image/webp','application/pdf') then raise exception 'Format bukti pembayaran tidak valid'; end if;
  if p_proof_size_bytes is null or p_proof_size_bytes <= 0 or p_proof_size_bytes > 10485760 then raise exception 'Ukuran bukti pembayaran tidak valid'; end if;
  if coalesce(btrim(p_idempotency_key),'') = '' then raise exception 'Kunci idempotensi wajib diisi'; end if;

  select * into link_row
  from public.payment_submission_links
  where token_hash = p_token_hash
  for update;

  if not found or link_row.revoked_at is not null or link_row.archived_at is not null then raise exception 'Tautan pembayaran tidak aktif'; end if;
  if link_row.expires_at <= now() then raise exception 'Tautan pembayaran sudah kedaluwarsa'; end if;
  if link_row.used_count >= link_row.max_uses then raise exception 'Batas penggunaan tautan pembayaran telah tercapai'; end if;
  if link_row.last_submission_at is not null and link_row.last_submission_at > now() - interval '10 seconds' then raise exception 'Mohon tunggu sebelum mengirim pembayaran berikutnya'; end if;
  if not exists(select 1 from public.orders where id=link_row.order_id and archived_at is null) then raise exception 'Pesanan tidak tersedia'; end if;

  select * into result_payment from public.order_payments
  where submission_idempotency_key = p_idempotency_key;
  if found then return result_payment; end if;

  insert into public.order_payments(
    order_id,amount,paid_at,method,channel_name,reference_number,status,
    customer_notes,proof_bucket,proof_path,proof_file_name,proof_mime_type,
    proof_size_bytes,submitted_at,submission_link_id,submission_idempotency_key,submission_source
  ) values (
    link_row.order_id,p_amount,p_paid_at,p_method,nullif(btrim(coalesce(p_channel_name,'')),''),
    nullif(btrim(coalesce(p_reference_number,'')),''),'pending',nullif(btrim(coalesce(p_customer_notes,'')),''),
    p_proof_bucket,p_proof_path,p_proof_file_name,p_proof_mime_type,p_proof_size_bytes,
    now(),link_row.id,p_idempotency_key,'customer_link'
  ) returning * into result_payment;

  update public.payment_submission_links
  set used_count=used_count+1,last_submission_at=now(),updated_at=now()
  where id=link_row.id;
  update public.orders set payment_status='menunggu_verifikasi',payment_submitted_at=now(),updated_at=now()
  where id=link_row.order_id;
  insert into public.payment_activity_history(order_id,payment_id,action,note,metadata)
  values(link_row.order_id,result_payment.id,'customer_submitted','Pembayaran pelanggan menunggu verifikasi',jsonb_build_object('link_id',link_row.id));
  return result_payment;
end;
$$;

create or replace function public.set_order_payment_requirement(
  p_order_id uuid,
  p_requirement_type text,
  p_percentage numeric,
  p_amount bigint,
  p_reason text,
  p_actor uuid
)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare result_order public.orders;
begin
  if not public.payment_actor_has_role(p_actor,array['owner','superadmin','super_admin','admin']) then raise exception 'Tidak berwenang mengubah kebijakan pembayaran'; end if;
  if p_requirement_type not in ('full','percentage','fixed','deposit') then raise exception 'Kebijakan pembayaran tidak valid'; end if;
  if p_requirement_type='percentage' and (p_percentage is null or p_percentage<0 or p_percentage>100) then raise exception 'Persentase tidak valid'; end if;
  if p_requirement_type in ('fixed','deposit') and (p_amount is null or p_amount<0) then raise exception 'Nominal minimum tidak valid'; end if;
  if p_requirement_type <> 'full' and coalesce(btrim(p_reason),'')='' then raise exception 'Alasan kebijakan khusus wajib diisi'; end if;
  update public.orders set
    payment_requirement_type=p_requirement_type,
    payment_required_percentage=case when p_requirement_type='percentage' then p_percentage else 100 end,
    payment_required_amount=case when p_requirement_type in ('fixed','deposit') then p_amount else null end,
    payment_requirement_override_reason=nullif(btrim(coalesce(p_reason,'')),''),
    payment_requirement_overridden_by=p_actor,
    payment_requirement_overridden_at=now(),updated_by=p_actor,updated_at=now()
  where id=p_order_id and archived_at is null returning * into result_order;
  if not found then raise exception 'Pesanan aktif tidak ditemukan'; end if;
  perform public.refresh_order_payment_summary(p_order_id);
  select * into result_order from public.orders where id=p_order_id;
  insert into public.payment_activity_history(order_id,action,note,actor_id,actor_role,running_balance,metadata)
  values(p_order_id,'requirement_changed',p_reason,p_actor,public.payment_actor_role(p_actor),result_order.payment_balance,
    jsonb_build_object('type',p_requirement_type,'percentage',p_percentage,'amount',p_amount));
  return result_order;
end;
$$;

create or replace function public.create_payment_adjustment(
  p_payment_id uuid,
  p_adjustment_type text,
  p_amount bigint,
  p_reason text,
  p_actor uuid
)
returns public.payment_adjustments
language plpgsql
security definer
set search_path = ''
as $$
declare payment_row public.order_payments; result_adjustment public.payment_adjustments; effect bigint;
begin
  if not public.payment_actor_has_role(p_actor,array['owner','superadmin','super_admin','admin']) then raise exception 'Tidak berwenang membuat koreksi pembayaran'; end if;
  select * into payment_row from public.order_payments where id=p_payment_id and status='verified' for update;
  if not found then raise exception 'Hanya pembayaran terverifikasi yang dapat dikoreksi'; end if;
  if p_adjustment_type not in ('adjustment_credit','adjustment_debit','reversal','refund','void') then raise exception 'Jenis koreksi tidak valid'; end if;
  if p_amount is null or p_amount<=0 or coalesce(btrim(p_reason),'')='' then raise exception 'Nominal dan alasan koreksi wajib diisi'; end if;
  if p_adjustment_type in ('reversal','refund','void') and p_amount>payment_row.amount then raise exception 'Koreksi melebihi pembayaran asal'; end if;
  effect:=case when p_adjustment_type='adjustment_credit' then p_amount else -p_amount end;
  insert into public.payment_adjustments(order_id,source_payment_id,adjustment_type,amount,effect_amount,reason,created_by)
  values(payment_row.order_id,p_payment_id,p_adjustment_type,p_amount,effect,btrim(p_reason),p_actor)
  returning * into result_adjustment;
  insert into public.payment_activity_history(order_id,payment_id,adjustment_id,action,note,actor_id,actor_role)
  values(payment_row.order_id,p_payment_id,result_adjustment.id,'adjustment_created',p_reason,p_actor,public.payment_actor_role(p_actor));
  return result_adjustment;
end;
$$;

create or replace function public.decide_payment_adjustment(
  p_adjustment_id uuid,
  p_approve boolean,
  p_reason text,
  p_actor uuid
)
returns public.payment_adjustments
language plpgsql
security definer
set search_path = ''
as $$
declare result_adjustment public.payment_adjustments; actor_role_value text;
begin
  actor_role_value:=public.payment_actor_role(p_actor);
  if actor_role_value not in ('owner','superadmin','super_admin','admin') then raise exception 'Tidak berwenang memutus koreksi'; end if;
  select * into result_adjustment from public.payment_adjustments where id=p_adjustment_id and status='pending' for update;
  if not found then raise exception 'Koreksi pending tidak ditemukan'; end if;
  if result_adjustment.created_by=p_actor and actor_role_value not in ('superadmin','super_admin') then raise exception 'Pembuat koreksi tidak boleh menyetujui koreksinya sendiri'; end if;
  if not p_approve and coalesce(btrim(p_reason),'')='' then raise exception 'Alasan penolakan wajib diisi'; end if;
  perform set_config('debroder.payment_adjustment_decision','on',true);
  update public.payment_adjustments set status=case when p_approve then 'approved' else 'rejected' end,
    approved_by=case when p_approve then p_actor else null end,approved_at=case when p_approve then now() else null end,
    rejected_by=case when p_approve then null else p_actor end,rejected_at=case when p_approve then null else now() end,
    rejection_reason=case when p_approve then null else btrim(p_reason) end
  where id=p_adjustment_id returning * into result_adjustment;
  perform public.refresh_order_payment_summary(result_adjustment.order_id);
  insert into public.payment_activity_history(order_id,payment_id,adjustment_id,action,note,actor_id,actor_role,
    running_balance) values(result_adjustment.order_id,result_adjustment.source_payment_id,result_adjustment.id,
    case when p_approve then 'adjustment_approved' else 'adjustment_rejected' end,p_reason,p_actor,actor_role_value,
    (select payment_balance from public.orders where id=result_adjustment.order_id));
  return result_adjustment;
end;
$$;

create or replace function public.prevent_payment_history_mutation()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
  if tg_table_name = 'payment_adjustments'
     and tg_op = 'UPDATE'
     and current_setting('debroder.payment_adjustment_decision',true) = 'on' then
    return new;
  end if;
  raise exception 'Riwayat pembayaran bersifat append-only';
end; $$;
drop trigger if exists prevent_payment_adjustment_update on public.payment_adjustments;
create trigger prevent_payment_adjustment_update before update or delete on public.payment_adjustments
for each row execute function public.prevent_payment_history_mutation();
drop trigger if exists prevent_payment_activity_history_mutation on public.payment_activity_history;
create trigger prevent_payment_activity_history_mutation before update or delete on public.payment_activity_history
for each row execute function public.prevent_payment_history_mutation();

revoke all on function public.submit_customer_order_payment(text,text,bigint,timestamptz,text,text,text,text,text,text,text,text,bigint) from public,anon,authenticated;
revoke all on function public.set_order_payment_requirement(uuid,text,numeric,bigint,text,uuid) from public,anon,authenticated;
revoke all on function public.create_payment_adjustment(uuid,text,bigint,text,uuid) from public,anon,authenticated;
revoke all on function public.decide_payment_adjustment(uuid,boolean,text,uuid) from public,anon,authenticated;
grant execute on function public.submit_customer_order_payment(text,text,bigint,timestamptz,text,text,text,text,text,text,text,text,bigint) to service_role;
grant execute on function public.set_order_payment_requirement(uuid,text,numeric,bigint,text,uuid) to service_role;
grant execute on function public.create_payment_adjustment(uuid,text,bigint,text,uuid) to service_role;
grant execute on function public.decide_payment_adjustment(uuid,boolean,text,uuid) to service_role;

alter table public.payment_submission_links enable row level security;
alter table public.payment_adjustments enable row level security;
alter table public.payment_activity_history enable row level security;
drop policy if exists "Staff read payment submission links" on public.payment_submission_links;
create policy "Staff read payment submission links" on public.payment_submission_links for select to authenticated
using (public.has_staff_role(array['owner','superadmin','super_admin','sales_admin','admin']));
drop policy if exists "Staff read payment adjustments" on public.payment_adjustments;
create policy "Staff read payment adjustments" on public.payment_adjustments for select to authenticated
using (public.has_staff_role(array['owner','superadmin','super_admin','sales_admin','admin']));
drop policy if exists "Staff read payment activity" on public.payment_activity_history;
create policy "Staff read payment activity" on public.payment_activity_history for select to authenticated
using (public.has_staff_role(array['owner','superadmin','super_admin','sales_admin','admin']));
revoke all on public.payment_submission_links,public.payment_adjustments,public.payment_activity_history from anon,authenticated;
grant select on public.payment_submission_links,public.payment_adjustments,public.payment_activity_history to authenticated;
grant all on public.payment_submission_links,public.payment_adjustments,public.payment_activity_history to service_role;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('payment-proofs','payment-proofs',false,10485760,array['image/png','image/jpeg','image/webp','application/pdf'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

commit;

-- Rollback: preserve/export payment_submission_links, payment_adjustments, and
-- payment_activity_history first. Drop Phase 5B RPCs/policies/tables, then the
-- added order/order_payments columns. Never delete existing Phase 5A payments.
