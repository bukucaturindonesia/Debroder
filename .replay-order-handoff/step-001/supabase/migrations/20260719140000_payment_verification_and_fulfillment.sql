begin;

-- DEBRODER payment verification and post-payment fulfillment refinement.
-- Additive only: Phase 5A/5B payment history, Commerce P0 stock guards, Job
-- Order, QC, and fulfillment tables remain canonical.

create table if not exists public.payment_method_settings (
  id uuid primary key default gen_random_uuid(),
  method_code text not null unique,
  method_type text not null,
  display_name text not null,
  bank_name text,
  account_number text,
  account_holder text,
  qris_image_url text,
  instructions text not null default '',
  expires_in_hours integer not null default 24,
  sort_order integer not null default 100,
  is_active boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payment_method_settings_code_check
    check (method_code ~ '^[a-z0-9][a-z0-9_-]{1,49}$'),
  constraint payment_method_settings_type_check
    check (method_type in ('bank_transfer','qris','ewallet')),
  constraint payment_method_settings_name_check
    check (btrim(display_name) <> ''),
  constraint payment_method_settings_expiry_check
    check (expires_in_hours between 1 and 720),
  constraint payment_method_settings_qris_url_check
    check (
      qris_image_url is null
      or qris_image_url ~ '^https://'
      or qris_image_url ~ '^/'
    )
);

create index if not exists payment_method_settings_active_idx
  on public.payment_method_settings(is_active, sort_order, display_name)
  where archived_at is null;

drop trigger if exists set_payment_method_settings_updated_at
  on public.payment_method_settings;
create trigger set_payment_method_settings_updated_at
before update on public.payment_method_settings
for each row execute function public.set_updated_at();

alter table public.payment_method_settings enable row level security;
revoke all on public.payment_method_settings from public, anon, authenticated;
grant all on public.payment_method_settings to service_role;

alter table public.order_payments
  add column if not exists reported_amount bigint,
  add column if not exists sender_name text,
  add column if not exists destination_payment_method_id uuid
    references public.payment_method_settings(id) on delete restrict,
  add column if not exists review_outcome text not null default 'pending',
  add column if not exists check_funds_received boolean,
  add column if not exists check_destination_account boolean,
  add column if not exists check_amount boolean,
  add column if not exists check_transaction_time boolean,
  add column if not exists check_reference_unique boolean,
  add column if not exists verified_amount bigint,
  add column if not exists verified_destination_account text,
  add column if not exists verified_transaction_at timestamptz,
  add column if not exists verified_reference text,
  add column if not exists settlement_classification text,
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid references auth.users(id) on delete set null;

update public.order_payments
set reported_amount=amount
where reported_amount is null;

alter table public.order_payments
  drop constraint if exists order_payments_review_outcome_check;
alter table public.order_payments
  add constraint order_payments_review_outcome_check check (
    review_outcome in (
      'pending','verified','funds_not_found','correction_requested','rejected'
    )
  );
alter table public.order_payments
  drop constraint if exists order_payments_verified_amount_check;
alter table public.order_payments
  add constraint order_payments_verified_amount_check
    check (verified_amount is null or verified_amount > 0);
alter table public.order_payments
  drop constraint if exists order_payments_settlement_classification_check;
alter table public.order_payments
  add constraint order_payments_settlement_classification_check check (
    settlement_classification is null
    or settlement_classification in (
      'partial','exact','overpayment','under_reported','over_reported'
    )
  );

create unique index if not exists order_payments_verified_reference_unique_idx
  on public.order_payments(lower(btrim(verified_reference)))
  where status='verified'
    and archived_at is null
    and verified_reference is not null
    and btrim(verified_reference) <> '';

create or replace function public.upsert_payment_method_setting(
  p_setting_id uuid,
  p_method_code text,
  p_method_type text,
  p_display_name text,
  p_bank_name text,
  p_account_number text,
  p_account_holder text,
  p_qris_image_url text,
  p_instructions text,
  p_expires_in_hours integer,
  p_sort_order integer,
  p_is_active boolean
)
returns public.payment_method_settings
language plpgsql
security definer
set search_path=''
as $$
declare
  result_setting public.payment_method_settings;
  normalized_code text:=lower(btrim(coalesce(p_method_code,'')));
  normalized_type text:=lower(btrim(coalesce(p_method_type,'')));
begin
  if not public.has_permission('payment.verify') then
    raise exception 'Not authorized to manage payment settings';
  end if;
  if normalized_code !~ '^[a-z0-9][a-z0-9_-]{1,49}$' then
    raise exception 'Kode metode pembayaran tidak valid';
  end if;
  if normalized_type not in ('bank_transfer','qris','ewallet') then
    raise exception 'Jenis metode pembayaran tidak valid';
  end if;
  if coalesce(btrim(p_display_name),'')='' then
    raise exception 'Nama metode pembayaran wajib diisi';
  end if;
  if p_expires_in_hours is null or p_expires_in_hours not between 1 and 720 then
    raise exception 'Masa berlaku pembayaran tidak valid';
  end if;
  if p_is_active and normalized_type='bank_transfer' and (
    coalesce(btrim(p_bank_name),'')=''
    or coalesce(btrim(p_account_number),'')=''
    or coalesce(btrim(p_account_holder),'')=''
  ) then
    raise exception 'Rekening bank aktif wajib memiliki bank, nomor rekening, dan nama pemilik';
  end if;
  if p_is_active and normalized_type='qris'
     and coalesce(btrim(p_qris_image_url),'')='' then
    raise exception 'Metode QRIS aktif wajib memiliki gambar QRIS';
  end if;
  if p_is_active and normalized_type='ewallet' and (
    coalesce(btrim(p_account_number),'')=''
    or coalesce(btrim(p_account_holder),'')=''
  ) then
    raise exception 'Dompet digital aktif wajib memiliki nomor tujuan dan nama pemilik';
  end if;
  if coalesce(btrim(p_qris_image_url),'')<>''
     and btrim(p_qris_image_url) !~ '^https://'
     and btrim(p_qris_image_url) !~ '^/' then
    raise exception 'URL gambar QRIS harus HTTPS atau path internal';
  end if;

  if p_setting_id is null then
    insert into public.payment_method_settings(
      method_code,method_type,display_name,bank_name,account_number,
      account_holder,qris_image_url,instructions,expires_in_hours,sort_order,
      is_active,created_by,updated_by
    ) values (
      normalized_code,normalized_type,btrim(p_display_name),
      nullif(btrim(coalesce(p_bank_name,'')),''),
      nullif(btrim(coalesce(p_account_number,'')),''),
      nullif(btrim(coalesce(p_account_holder,'')),''),
      nullif(btrim(coalesce(p_qris_image_url,'')),''),
      btrim(coalesce(p_instructions,'')),p_expires_in_hours,
      coalesce(p_sort_order,100),p_is_active,auth.uid(),auth.uid()
    )
    returning * into result_setting;
  else
    update public.payment_method_settings set
      method_code=normalized_code,
      method_type=normalized_type,
      display_name=btrim(p_display_name),
      bank_name=nullif(btrim(coalesce(p_bank_name,'')),''),
      account_number=nullif(btrim(coalesce(p_account_number,'')),''),
      account_holder=nullif(btrim(coalesce(p_account_holder,'')),''),
      qris_image_url=nullif(btrim(coalesce(p_qris_image_url,'')),''),
      instructions=btrim(coalesce(p_instructions,'')),
      expires_in_hours=p_expires_in_hours,
      sort_order=coalesce(p_sort_order,100),
      is_active=p_is_active,
      updated_by=auth.uid(),
      updated_at=now()
    where id=p_setting_id and archived_at is null
    returning * into result_setting;
    if not found then raise exception 'Pengaturan pembayaran tidak ditemukan'; end if;
  end if;

  insert into public.system_audit_log(
    entity_type,entity_id,action,actor_id,actor_role,source,new_value
  ) values (
    'payment_method_setting',result_setting.id,'payment_method_setting_saved',
    auth.uid(),public.current_actor_role(),'payment_verification',
    jsonb_build_object(
      'method_code',result_setting.method_code,
      'method_type',result_setting.method_type,
      'is_active',result_setting.is_active,
      'sort_order',result_setting.sort_order
    )
  );
  return result_setting;
end;
$$;

create or replace function public.submit_customer_order_payment_v2(
  p_token_hash text,
  p_idempotency_key text,
  p_amount bigint,
  p_paid_at timestamptz,
  p_destination_method_id uuid,
  p_sender_name text,
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
set search_path=''
as $$
declare
  link_row public.payment_submission_links;
  setting_row public.payment_method_settings;
  result_payment public.order_payments;
  method_value text;
begin
  if p_amount is null or p_amount<=0 then
    raise exception 'Nominal pembayaran harus lebih besar dari nol';
  end if;
  if p_paid_at is null or p_paid_at>now()+interval '1 day'
     or p_paid_at<now()-interval '2 years' then
    raise exception 'Tanggal pembayaran tidak valid';
  end if;
  if coalesce(btrim(p_sender_name),'')='' or char_length(btrim(p_sender_name))>150 then
    raise exception 'Nama pengirim wajib diisi';
  end if;
  if p_proof_bucket<>'payment-proofs' or coalesce(p_proof_path,'')='' then
    raise exception 'Bukti pembayaran wajib diunggah';
  end if;
  if p_proof_mime_type not in ('image/png','image/jpeg','application/pdf') then
    raise exception 'Format bukti pembayaran tidak valid';
  end if;
  if p_proof_size_bytes is null or p_proof_size_bytes<=0
     or p_proof_size_bytes>5242880 then
    raise exception 'Ukuran bukti pembayaran maksimal 5 MB';
  end if;
  if coalesce(btrim(p_idempotency_key),'')=''
     or p_idempotency_key !~ '^[a-zA-Z0-9_-]{16,100}$' then
    raise exception 'Kunci idempotensi tidak valid';
  end if;

  select * into setting_row
  from public.payment_method_settings
  where id=p_destination_method_id and is_active and archived_at is null;
  if not found then raise exception 'Metode pembayaran tidak aktif'; end if;
  method_value:=setting_row.method_type;

  select * into link_row
  from public.payment_submission_links
  where token_hash=p_token_hash
  for update;
  if not found or link_row.revoked_at is not null or link_row.archived_at is not null then
    raise exception 'Tautan pembayaran tidak aktif';
  end if;
  if link_row.expires_at<=now() then raise exception 'Tautan pembayaran sudah kedaluwarsa'; end if;
  if link_row.used_count>=link_row.max_uses then
    raise exception 'Batas penggunaan tautan pembayaran telah tercapai';
  end if;
  if link_row.last_submission_at is not null
     and link_row.last_submission_at>now()-interval '10 seconds' then
    raise exception 'Mohon tunggu sebelum mengirim pembayaran berikutnya';
  end if;
  if not exists(
    select 1 from public.orders
    where id=link_row.order_id and archived_at is null
      and pricing_status='final' and total_amount>0
      and status not in ('cancelled','expired','dibatalkan','completed','selesai')
  ) then raise exception 'Pesanan tidak tersedia untuk pembayaran'; end if;

  select * into result_payment
  from public.order_payments
  where submission_idempotency_key=p_idempotency_key;
  if found then
    if result_payment.order_id<>link_row.order_id
       or result_payment.submission_link_id<>link_row.id then
      raise exception 'Kunci idempotensi telah digunakan untuk transaksi lain';
    end if;
    return result_payment;
  end if;

  insert into public.order_payments(
    order_id,amount,reported_amount,paid_at,method,channel_name,
    reference_number,status,customer_notes,sender_name,
    destination_payment_method_id,review_outcome,proof_bucket,proof_path,
    proof_file_name,proof_mime_type,proof_size_bytes,submitted_at,
    submission_link_id,submission_idempotency_key,submission_source
  ) values (
    link_row.order_id,p_amount,p_amount,p_paid_at,method_value,
    nullif(btrim(coalesce(p_channel_name,'')),''),
    nullif(btrim(coalesce(p_reference_number,'')),''),'pending',
    nullif(btrim(coalesce(p_customer_notes,'')),''),btrim(p_sender_name),
    setting_row.id,'pending',p_proof_bucket,p_proof_path,p_proof_file_name,
    p_proof_mime_type,p_proof_size_bytes,now(),link_row.id,
    p_idempotency_key,'customer_link'
  ) returning * into result_payment;

  update public.payment_submission_links
  set used_count=used_count+1,last_submission_at=now(),updated_at=now()
  where id=link_row.id;
  update public.orders
  set payment_status='pending_verification',payment_submitted_at=now(),updated_at=now()
  where id=link_row.order_id;
  insert into public.payment_activity_history(
    order_id,payment_id,action,note,metadata
  ) values (
    link_row.order_id,result_payment.id,'customer_submitted',
    'Laporan pembayaran pelanggan menunggu pemeriksaan mutasi bank',
    jsonb_build_object('link_id',link_row.id,'destination_method_id',setting_row.id)
  );
  return result_payment;
end;
$$;

create or replace function public.refresh_order_payment_summary(p_order_id uuid)
returns public.orders
language plpgsql
security definer
set search_path=''
as $$
declare
  result_order public.orders;
  verified_total bigint;
  adjustment_total bigint;
  effective_total bigint;
  required_total bigint;
  has_pending boolean;
  has_rejected boolean;
begin
  select coalesce(sum(coalesce(verified_amount,amount)),0)::bigint
  into verified_total
  from public.order_payments
  where order_id=p_order_id and status='verified' and archived_at is null;

  select coalesce(sum(effect_amount),0)::bigint into adjustment_total
  from public.payment_adjustments
  where order_id=p_order_id and status='approved' and archived_at is null;

  select exists(
    select 1 from public.order_payments
    where order_id=p_order_id and status='pending' and archived_at is null
  ) into has_pending;
  select exists(
    select 1 from public.order_payments
    where order_id=p_order_id and status='rejected' and archived_at is null
  ) into has_rejected;

  effective_total:=greatest(verified_total+adjustment_total,0);
  select case payment_requirement_type
    when 'percentage' then ceil(total_amount::numeric*payment_required_percentage/100)::bigint
    when 'fixed' then least(coalesce(payment_required_amount,0),total_amount::bigint)
    when 'deposit' then least(coalesce(payment_required_amount,0),total_amount::bigint)
    else total_amount::bigint
  end into required_total
  from public.orders where id=p_order_id for update;
  if not found then raise exception 'Order not found'; end if;

  update public.orders set
    payment_total_verified=verified_total,
    payment_effective_total=effective_total,
    payment_required_amount=required_total,
    payment_balance=greatest(total_amount::bigint-effective_total,0),
    payment_percentage=case when total_amount>0
      then least(100,round((effective_total::numeric/total_amount::numeric)*100,2))
      else 0 end,
    payment_requirement_met=effective_total>=required_total,
    payment_production_eligible=effective_total>=required_total,
    payment_status=case
      when has_pending then 'pending_verification'
      when effective_total>=total_amount::bigint and total_amount>0 then 'paid'
      when effective_total>0 then 'partially_paid'
      when has_rejected then 'rejected'
      else 'unpaid' end,
    status=case
      when effective_total>=total_amount::bigint and total_amount>0
       and status in ('awaiting_payment','processing') then 'confirmed'
      else status end,
    updated_at=now()
  where id=p_order_id returning * into result_order;

  if result_order.payment_status='paid'
     and result_order.checkout_source='public_checkout' then
    if result_order.archived_at is not null
       or result_order.status in ('cancelled','dibatalkan','expired') then
      raise exception 'Cancelled, expired, or archived order cannot complete payment';
    end if;
    if exists(
      select 1 from public.stock_reservations
      where order_id=p_order_id and status='active'
    ) then
      perform public.consume_paid_order_stock(p_order_id);
    elsif exists(
      select 1 from public.stock_reservations
      where order_id=p_order_id and status='consumed'
    ) then
      null;
    else
      raise exception 'Valid stock reservation is required before payment completion';
    end if;
  end if;
  return result_order;
end;
$$;

create or replace function public.capture_order_payment_activity()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  action_value text;
  actor_value uuid:=coalesce(new.updated_by,new.created_by,(select auth.uid()));
  balance_value bigint;
begin
  if tg_op='INSERT' then
    if new.submission_source<>'admin' then return new; end if;
    action_value:='payment_created';
  elsif new.status is distinct from old.status then
    action_value:=case
      when new.status='verified' then 'payment_verified'
      when new.review_outcome='funds_not_found' then 'payment_funds_not_found'
      when new.review_outcome='correction_requested' then 'payment_correction_requested'
      when new.status='rejected' then 'payment_rejected'
      when new.status='refunded' then 'payment_refunded'
      else 'payment_status_changed' end;
  elsif new.archived_at is distinct from old.archived_at then
    action_value:=case when new.archived_at is null
      then 'payment_restored' else 'payment_archived' end;
  else
    return new;
  end if;

  perform public.refresh_order_payment_summary(new.order_id);
  select payment_balance into balance_value
  from public.orders where id=new.order_id;
  insert into public.payment_activity_history(
    order_id,payment_id,action,note,actor_id,actor_role,running_balance,metadata
  ) values (
    new.order_id,new.id,action_value,
    coalesce(new.rejection_reason,new.admin_notes),actor_value,
    public.payment_actor_role(actor_value),balance_value,
    jsonb_build_object(
      'from_status',case when tg_op='UPDATE' then old.status else null end,
      'to_status',new.status,
      'review_outcome',new.review_outcome,
      'verified_amount',new.verified_amount,
      'verified_reference',new.verified_reference,
      'settlement_classification',new.settlement_classification,
      'checks',jsonb_build_object(
        'funds_received',new.check_funds_received,
        'destination_account',new.check_destination_account,
        'amount',new.check_amount,
        'transaction_time',new.check_transaction_time,
        'reference_unique',new.check_reference_unique
      )
    )
  );
  return new;
end;
$$;

create or replace function public.review_order_payment(
  p_payment_id uuid,
  p_action text,
  p_destination_method_id uuid,
  p_check_funds_received boolean,
  p_check_destination_account boolean,
  p_check_amount boolean,
  p_check_transaction_time boolean,
  p_check_reference_unique boolean,
  p_verified_amount bigint,
  p_verified_destination_account text,
  p_verified_transaction_at timestamptz,
  p_verified_reference text,
  p_admin_notes text,
  p_reason text,
  p_expected_updated_at timestamptz
)
returns public.order_payments
language plpgsql
security definer
set search_path=''
as $$
declare
  result_payment public.order_payments;
  order_row public.orders;
  setting_row public.payment_method_settings;
  normalized_action text:=lower(btrim(coalesce(p_action,'')));
  normalized_reference text:=btrim(coalesce(p_verified_reference,''));
  normalized_destination text:=btrim(coalesce(p_verified_destination_account,''));
  expected_destination text;
  classification text;
begin
  if not public.has_permission('payment.verify') then
    raise exception 'Not authorized to verify';
  end if;
  if normalized_action not in (
    'verify','funds_not_found','request_correction','reject'
  ) then raise exception 'Aksi pemeriksaan pembayaran tidak valid'; end if;

  select p.* into result_payment
  from public.order_payments p
  join public.orders o on o.id=p.order_id
  where p.id=p_payment_id
  for update of p,o;
  if not found or result_payment.status<>'pending'
     or result_payment.archived_at is not null then
    raise exception 'Pending payment not found';
  end if;
  select * into order_row from public.orders where id=result_payment.order_id;
  if p_expected_updated_at is null
     or result_payment.updated_at<>p_expected_updated_at then
    raise exception 'STALE_PAYMENT_REVIEW';
  end if;
  if order_row.archived_at is not null
     or order_row.status in ('cancelled','dibatalkan','expired','completed','selesai') then
    raise exception 'Payment cannot be reviewed for inactive order';
  end if;
  if coalesce(result_payment.proof_path,'')='' then
    raise exception 'Bukti pembayaran wajib diperiksa';
  end if;

  if coalesce(p_destination_method_id,result_payment.destination_payment_method_id) is not null then
    select * into setting_row
    from public.payment_method_settings
    where id=coalesce(p_destination_method_id,result_payment.destination_payment_method_id)
      and archived_at is null;
  end if;

  if normalized_action='verify' then
    if setting_row.id is null then
      raise exception 'Rekening tujuan pembayaran tidak ditemukan';
    end if;
    if setting_row.method_type in ('bank_transfer','ewallet')
       and coalesce(btrim(setting_row.account_number),'')='' then
      raise exception 'Nomor rekening tujuan belum dikonfigurasi';
    end if;
    expected_destination:=coalesce(setting_row.account_number,setting_row.display_name);
    if not coalesce(p_check_funds_received,false)
       or not coalesce(p_check_destination_account,false)
       or not coalesce(p_check_amount,false)
       or not coalesce(p_check_transaction_time,false)
       or not coalesce(p_check_reference_unique,false) then
      raise exception 'Seluruh checklist mutasi bank wajib dikonfirmasi';
    end if;
    if p_verified_amount is null or p_verified_amount<=0 then
      raise exception 'Nominal aktual mutasi wajib diisi';
    end if;
    if p_verified_transaction_at is null
       or p_verified_transaction_at>now()+interval '1 day' then
      raise exception 'Waktu transaksi mutasi tidak valid';
    end if;
    if normalized_reference='' then raise exception 'Referensi mutasi wajib diisi'; end if;
    if normalized_destination<>btrim(expected_destination) then
      raise exception 'Rekening tujuan tidak sesuai pengaturan pembayaran';
    end if;
    if exists(
      select 1 from public.order_payments
      where id<>p_payment_id and status='verified' and archived_at is null
        and lower(btrim(verified_reference))=lower(normalized_reference)
    ) then raise exception 'DUPLICATE_BANK_REFERENCE'; end if;

    classification:=case
      when p_verified_amount>order_row.payment_balance then 'overpayment'
      when p_verified_amount<coalesce(result_payment.reported_amount,result_payment.amount)
        then 'under_reported'
      when p_verified_amount>coalesce(result_payment.reported_amount,result_payment.amount)
        then 'over_reported'
      when p_verified_amount<order_row.payment_balance then 'partial'
      else 'exact' end;

    update public.order_payments set
      status='verified',review_outcome='verified',
      destination_payment_method_id=coalesce(setting_row.id,destination_payment_method_id),
      check_funds_received=true,check_destination_account=true,
      check_amount=true,check_transaction_time=true,check_reference_unique=true,
      verified_amount=p_verified_amount,
      verified_destination_account=normalized_destination,
      verified_transaction_at=p_verified_transaction_at,
      verified_reference=normalized_reference,
      settlement_classification=classification,
      admin_notes=nullif(btrim(coalesce(p_admin_notes,'')),''),
      rejection_reason=null,reviewed_at=now(),reviewed_by=auth.uid(),
      verified_at=now(),verified_by=auth.uid(),updated_by=auth.uid(),updated_at=now()
    where id=p_payment_id returning * into result_payment;
  else
    if coalesce(btrim(p_reason),'')='' then
      raise exception 'Alasan tindak lanjut wajib diisi';
    end if;
    update public.order_payments set
      status='rejected',
      review_outcome=case normalized_action
        when 'funds_not_found' then 'funds_not_found'
        when 'request_correction' then 'correction_requested'
        else 'rejected' end,
      destination_payment_method_id=coalesce(setting_row.id,destination_payment_method_id),
      check_funds_received=p_check_funds_received,
      check_destination_account=p_check_destination_account,
      check_amount=p_check_amount,
      check_transaction_time=p_check_transaction_time,
      check_reference_unique=p_check_reference_unique,
      admin_notes=nullif(btrim(coalesce(p_admin_notes,'')),''),
      rejection_reason=btrim(p_reason),reviewed_at=now(),reviewed_by=auth.uid(),
      rejected_at=now(),rejected_by=auth.uid(),updated_by=auth.uid(),updated_at=now()
    where id=p_payment_id returning * into result_payment;
  end if;
  return result_payment;
end;
$$;

alter table public.fulfillments
  add column if not exists final_verification_checklist jsonb,
  add column if not exists final_verified_at timestamptz,
  add column if not exists final_verified_by uuid references auth.users(id) on delete set null,
  add column if not exists final_verification_note text;

create or replace function public.complete_fulfillment_final_verification(
  p_fulfillment_id uuid,
  p_checklist jsonb,
  p_note text,
  p_expected_updated_at timestamptz
)
returns public.fulfillments
language plpgsql
security definer
set search_path=''
as $$
declare
  result_row public.fulfillments;
  order_row public.orders;
  required_key text;
  is_custom boolean;
begin
  if not public.has_permission('shipping.update') then
    raise exception 'Tidak berwenang melakukan pengecekan akhir';
  end if;
  select * into result_row from public.fulfillments
  where id=p_fulfillment_id and archived_at is null for update;
  if not found then raise exception 'Dokumen penyerahan tidak ditemukan'; end if;
  if result_row.status<>'packing' then
    raise exception 'Pengecekan akhir hanya tersedia setelah packing';
  end if;
  if result_row.updated_at is distinct from p_expected_updated_at then
    raise exception 'Data ini telah diperbarui oleh admin lain';
  end if;
  select * into order_row from public.orders where id=result_row.order_id for update;
  if not found then raise exception 'Pesanan tidak ditemukan'; end if;
  if not coalesce(order_row.payment_production_eligible,false) then
    raise exception 'Syarat pembayaran belum terpenuhi';
  end if;
  if coalesce(jsonb_typeof(p_checklist),'')<>'object' then
    raise exception 'Checklist pengecekan akhir tidak valid';
  end if;
  is_custom:=case
    when jsonb_typeof(order_row.custom_project_snapshot)='array'
      then jsonb_array_length(order_row.custom_project_snapshot)>0
    else false end;

  foreach required_key in array array[
    'order_number','customer','phone','product','variant','color','size',
    'quantity','package_content','package_count','fulfillment_method','package_condition'
  ] loop
    if coalesce((p_checklist->>required_key)::boolean,false) is not true then
      raise exception 'Checklist pengecekan akhir belum lengkap';
    end if;
  end loop;
  if is_custom then
    foreach required_key in array array[
      'method','design','placement','print_size','personalization','qc'
    ] loop
      if coalesce((p_checklist->>required_key)::boolean,false) is not true then
        raise exception 'Checklist Custom dan QC belum lengkap';
      end if;
    end loop;
  end if;
  if result_row.method='shipping' then
    foreach required_key in array array['recipient_address','postal_code'] loop
      if coalesce((p_checklist->>required_key)::boolean,false) is not true then
        raise exception 'Checklist penerima pengiriman belum lengkap';
      end if;
    end loop;
  end if;

  update public.fulfillments set
    final_verification_checklist=p_checklist,
    final_verified_at=now(),final_verified_by=auth.uid(),
    final_verification_note=nullif(btrim(coalesce(p_note,'')),''),
    updated_by=auth.uid(),updated_at=now()
  where id=result_row.id returning * into result_row;
  insert into public.fulfillment_status_history(
    fulfillment_id,from_status,to_status,note,changed_by,metadata
  ) values (
    result_row.id,'packing','packing','Pengecekan akhir fulfillment selesai',
    auth.uid(),jsonb_build_object(
      'event','fulfillment_final_verification_completed','is_custom',is_custom
    )
  );
  return result_row;
end;
$$;

create or replace function public.guard_fulfillment_final_verification()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
begin
  if old.status='packing'
     and new.status in ('ready_to_ship','ready_for_pickup')
     and new.final_verified_at is null then
    raise exception 'Pengecekan akhir wajib diselesaikan sebelum pengiriman atau pickup';
  end if;
  if old.status='packing' and new.status='packing'
     and (old.receiver_name,old.receiver_phone,old.destination,old.courier,
          old.tracking_number,old.package_count)
       is distinct from
         (new.receiver_name,new.receiver_phone,new.destination,new.courier,
          new.tracking_number,new.package_count) then
    new.final_verification_checklist:=null;
    new.final_verified_at:=null;
    new.final_verified_by:=null;
    new.final_verification_note:=null;
  end if;
  return new;
end;
$$;

drop trigger if exists guard_custom_fulfillment_final_verification_v1
  on public.fulfillments;
drop trigger if exists guard_fulfillment_final_verification
  on public.fulfillments;
create trigger guard_fulfillment_final_verification
before update on public.fulfillments
for each row execute function public.guard_fulfillment_final_verification();

revoke all on function public.upsert_payment_method_setting(
  uuid,text,text,text,text,text,text,text,text,integer,integer,boolean
) from public,anon,authenticated;
grant execute on function public.upsert_payment_method_setting(
  uuid,text,text,text,text,text,text,text,text,integer,integer,boolean
) to authenticated,service_role;

revoke all on function public.submit_customer_order_payment_v2(
  text,text,bigint,timestamptz,uuid,text,text,text,text,text,text,text,text,bigint
) from public,anon,authenticated;
grant execute on function public.submit_customer_order_payment_v2(
  text,text,bigint,timestamptz,uuid,text,text,text,text,text,text,text,text,bigint
) to service_role;

revoke all on function public.review_order_payment(
  uuid,text,uuid,boolean,boolean,boolean,boolean,boolean,bigint,text,timestamptz,
  text,text,text,timestamptz
) from public,anon,authenticated;
grant execute on function public.review_order_payment(
  uuid,text,uuid,boolean,boolean,boolean,boolean,boolean,bigint,text,timestamptz,
  text,text,text,timestamptz
) to authenticated,service_role;

revoke all on function public.complete_fulfillment_final_verification(
  uuid,jsonb,text,timestamptz
) from public,anon,authenticated;
grant execute on function public.complete_fulfillment_final_verification(
  uuid,jsonb,text,timestamptz
) to authenticated,service_role;
revoke all on function public.guard_fulfillment_final_verification()
  from public,anon,authenticated;

-- Prevent authenticated clients from bypassing the mutation checklist through
-- the legacy Phase 5A review RPCs. Trusted server composition remains possible.
revoke all on function public.verify_order_payment(uuid,text)
  from public,anon,authenticated;
revoke all on function public.reject_order_payment(uuid,text)
  from public,anon,authenticated;
grant execute on function public.verify_order_payment(uuid,text) to service_role;
grant execute on function public.reject_order_payment(uuid,text) to service_role;

revoke all on function public.refresh_order_payment_summary(uuid)
  from public,anon,authenticated;
grant execute on function public.refresh_order_payment_summary(uuid) to service_role;

commit;

-- Recovery (no destructive automatic rollback): deactivate all new payment
-- method settings, restore the previous review route/RPC grants, and preserve
-- payment_method_settings plus the additive verification columns as audit data.
