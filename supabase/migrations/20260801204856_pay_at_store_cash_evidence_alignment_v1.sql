-- P0 Pay at Store cash evidence alignment.
-- The canonical pickup action must satisfy the verified-payment integrity guard
-- without routing a cash receipt through the legacy bank-verification helper.
create or replace function public.record_pay_at_store_payment_v1(
  p_fulfillment_id uuid,
  p_admin_notes text default null,
  p_expected_updated_at timestamptz default null
)
returns public.order_payments
language plpgsql
security definer
set search_path = ''
as $$
declare
  fulfillment_value public.fulfillments;
  order_value public.orders;
  payment_value public.order_payments;
  cash_reference text;
begin
  if not public.has_permission('payment.create')
     or not public.has_permission('payment.verify') then
    raise exception 'Tidak berwenang mencatat pembayaran di toko';
  end if;

  select * into fulfillment_value
  from public.fulfillments
  where id = p_fulfillment_id and archived_at is null
  for update;
  if not found then raise exception 'Pickup belum siap menerima pembayaran'; end if;

  select * into order_value
  from public.orders
  where id = fulfillment_value.order_id
  for update;
  if not found then raise exception 'Order bayar di toko tidak ditemukan'; end if;

  if fulfillment_value.method <> 'pickup'
     or order_value.payment_method <> 'pay_at_store'
     or fulfillment_value.status <> 'ready_for_pickup' then
    raise exception 'Pembayaran di toko hanya tersedia pada pickup yang sudah siap';
  end if;
  if fulfillment_value.customer_arrived_at is null
     or fulfillment_value.final_verified_at is null then
    raise exception 'Kedatangan dan verifikasi akhir wajib selesai sebelum pembayaran';
  end if;

  select * into payment_value
  from public.order_payments
  where order_id = order_value.id
    and archived_at is null
    and (status = 'verified' or review_outcome = 'verified')
  order by verified_at desc nulls last, created_at desc
  limit 1;
  if found then
    perform public.refresh_order_payment_summary(order_value.id);
    return payment_value;
  end if;

  if p_expected_updated_at is not null
     and fulfillment_value.updated_at is distinct from p_expected_updated_at then
    raise exception 'Data ini telah diperbarui oleh admin lain';
  end if;
  if coalesce(order_value.payment_balance, 0) <= 0 then
    raise exception 'Sisa pembayaran canonical tidak valid';
  end if;

  cash_reference := format('PAY-AT-STORE:%s', order_value.id);

  select * into payment_value
  from public.create_order_payment(
    order_value.id,
    order_value.payment_balance,
    now(),
    'cash',
    'Pickup Toko',
    cash_reference,
    null,
    coalesce(
      nullif(btrim(coalesce(p_admin_notes, '')), ''),
      'Pembayaran penuh diterima saat pickup'
    ),
    null,
    null,
    null,
    null
  );

  update public.order_payments
  set status = 'verified',
      review_outcome = 'verified',
      check_funds_received = true,
      check_destination_account = true,
      check_amount = true,
      check_transaction_time = true,
      check_reference_unique = true,
      verified_amount = payment_value.amount,
      verified_destination_account = 'Kasir Pickup Toko',
      verified_transaction_at = coalesce(payment_value.paid_at, now()),
      verified_reference = cash_reference,
      settlement_classification = 'exact',
      reviewed_at = now(),
      reviewed_by = auth.uid(),
      verified_at = now(),
      verified_by = auth.uid(),
      updated_by = auth.uid(),
      updated_at = now(),
      admin_notes = coalesce(
        nullif(btrim(coalesce(p_admin_notes, '')), ''),
        'Pembayaran penuh diterima saat pickup'
      )
  where id = payment_value.id
    and status = 'pending'
    and archived_at is null
  returning * into payment_value;

  if not found then
    raise exception 'Pembayaran di toko gagal disimpan secara canonical';
  end if;

  perform public.sync_order_handoff_v2(order_value.id, null);
  return payment_value;
end
$$;

revoke all on function public.record_pay_at_store_payment_v1(uuid, text, timestamptz)
  from public, anon;
grant execute on function public.record_pay_at_store_payment_v1(uuid, text, timestamptz)
  to authenticated, service_role;
