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
$$;;
