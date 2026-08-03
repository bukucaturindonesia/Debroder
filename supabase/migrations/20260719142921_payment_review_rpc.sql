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
$$;;
