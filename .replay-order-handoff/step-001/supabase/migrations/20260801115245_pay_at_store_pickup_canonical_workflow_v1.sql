-- DEBRODER P0: canonical Pay at Store + Store Pickup workflow.
-- Additive milestones preserve the existing order/fulfillment/payment authorities.

alter table public.fulfillments
  add column if not exists customer_arrived_at timestamptz,
  add column if not exists customer_arrived_by uuid references auth.users(id),
  add column if not exists customer_arrival_note text,
  add column if not exists handover_completed_at timestamptz,
  add column if not exists handover_completed_by uuid references auth.users(id),
  add column if not exists handover_note text;

comment on column public.fulfillments.customer_arrived_at is
  'Pay-at-store pickup milestone: customer is physically present before final verification.';
comment on column public.fulfillments.handover_completed_at is
  'Pay-at-store pickup milestone: paid goods and proof were handed to the customer before terminal close.';

create or replace function public.guard_fulfillment_final_verification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  payment_method_value text;
begin
  if old.status = 'packing'
     and new.status in ('ready_to_ship', 'ready_for_pickup')
     and new.final_verified_at is null then
    select o.payment_method
    into payment_method_value
    from public.orders o
    where o.id = new.order_id;

    if not (
      new.method = 'pickup'
      and new.status = 'ready_for_pickup'
      and payment_method_value = 'pay_at_store'
    ) then
      raise exception 'Pengecekan akhir wajib diselesaikan sebelum pengiriman atau pickup';
    end if;
  end if;

  if old.status = 'packing'
     and new.status = 'packing'
     and (
       old.receiver_name,
       old.receiver_phone,
       old.destination,
       old.courier,
       old.tracking_number,
       old.package_count
     ) is distinct from (
       new.receiver_name,
       new.receiver_phone,
       new.destination,
       new.courier,
       new.tracking_number,
       new.package_count
     ) then
    new.final_verification_checklist := null;
    new.final_verified_at := null;
    new.final_verified_by := null;
    new.final_verification_note := null;
  end if;

  return new;
end
$$;

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
  payment_verified boolean := false;
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
  is_shipping := o.delivery_method in ('shipping', 'delivery');
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

  payment_verified := o.payment_requirement_met
    or o.payment_status in ('paid', 'verified', 'terverifikasi')
    or p.status = 'verified'
    or p.review_outcome = 'verified';

  select
    (array_agg(e.message order by case e.severity when 'critical' then 0 else 1 end, e.code))[1],
    coalesce(jsonb_agg(e.message order by case e.severity when 'critical' then 0 else 1 end, e.code), '[]'::jsonb),
    coalesce(bool_or(e.hard_block), false)
  into warning_text, warnings_json, hard_block_issue
  from public._evaluate_order_integrity_v1(p_order_id) e;

  if o.status in ('completed', 'selesai') or f.status in ('delivered', 'picked_up') then
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

  elsif o.status in ('cancelled', 'dibatalkan', 'expired') then
    stage := case when o.status = 'expired' then 'expired' else 'cancelled' end;
    responsibility := 'customer'; responsibility_label := 'TINDAKAN ANDA'; tone := 'warning';
    admin_task_type := case when warning_text is null then null else 'resolve_integrity' end;
    customer_label := case when o.status = 'expired' then 'Kedaluwarsa' else 'Dibatalkan' end;
    admin_label := case when o.status = 'expired' then 'Pesanan Kedaluwarsa' else 'Pesanan Dibatalkan' end;
    customer_title := case when o.status = 'expired' then 'Masa pesanan telah berakhir' else 'Pesanan tidak aktif' end;
    customer_description := 'Hubungi Admin DEBRODER bila Anda masih ingin melanjutkan atau membuat pesanan baru.';
    primary_action := 'contact_admin'; previous_stage := 'Pesanan Dibuat'; next_stage := 'Hubungi Admin';
    next_step := 'Admin akan membantu memeriksa pilihan yang masih tersedia.';
    blocking_reason := case when o.status = 'expired' then 'Masa berlaku pesanan telah berakhir.' else 'Pesanan telah dibatalkan.' end;
    terminal := true;

  elsif hard_block_issue then
    stage := 'integrity_review'; responsibility := 'debroder'; responsibility_label := 'SEDANG DIPROSES DEBRODER';
    tone := 'warning'; admin_task_type := 'resolve_integrity'; customer_label := 'Status Sedang Diperbarui';
    admin_label := 'Periksa Integritas Pesanan'; customer_title := 'Status pesanan sedang diperbarui';
    customer_description := 'Pesanan tetap tersimpan. Tim DEBRODER sedang memeriksa konsistensi tahap operasionalnya.';
    primary_action := 'review_order'; previous_stage := 'Pesanan Tercatat'; next_stage := 'Tahap Aman Berikutnya';
    next_step := 'Proses dilanjutkan setelah kondisi pesanan dinyatakan konsisten.';
    blocking_reason := warning_text;

  elsif f.status = 'ready_for_pickup' and is_pay_at_store and is_pickup then
    responsibility := 'debroder'; responsibility_label := 'SEDANG DIPROSES DEBRODER'; tone := 'processing';
    blocking_reason := null; revision := coalesce(f.updated_at::text, f.id::text);
    if f.customer_arrived_at is null then
      stage := 'ready_for_pickup'; responsibility := 'customer'; responsibility_label := 'TINDAKAN ANDA'; tone := 'action';
      admin_task_type := 'confirm_customer_arrival'; customer_label := 'Barang Siap Diambil';
      admin_label := 'Konfirmasi Kedatangan Pelanggan'; customer_title := 'Barang siap diambil dan dibayar di toko';
      customer_description := 'Hubungi Admin sebelum berangkat dan tunjukkan nomor pesanan saat tiba di toko.';
      primary_action := 'confirm_customer_arrival'; previous_stage := 'Persiapan / Produksi';
      next_stage := 'Verifikasi Akhir & Harga'; next_step := 'Saat Anda tiba, Admin memulai verifikasi akhir sebelum pembayaran.';
    elsif f.final_verified_at is null then
      stage := 'pickup_final_verification'; admin_task_type := 'run_final_check';
      customer_label := 'Verifikasi Akhir & Harga'; admin_label := 'Lakukan Verifikasi Akhir & Harga';
      customer_title := 'Verifikasi akhir sedang dilakukan';
      customer_description := 'Anda sudah tiba di toko. Admin sedang mencocokkan barang, jumlah, dan total canonical sebelum pembayaran.';
      primary_action := 'run_final_check'; previous_stage := 'Siap Diambil'; next_stage := 'Pembayaran di Toko';
      next_step := 'Pembayaran dicatat setelah checklist dan total canonical dikonfirmasi.';
      blocking_reason := 'Checklist verifikasi akhir belum selesai.';
    elsif not payment_verified then
      stage := 'pickup_payment'; admin_task_type := 'record_pay_at_store_payment';
      customer_label := 'Pembayaran di Toko'; admin_label := 'Catat Pembayaran di Toko';
      customer_title := 'Menunggu pencatatan pembayaran';
      customer_description := 'Verifikasi akhir selesai. Admin akan mencatat pembayaran sesuai total canonical pesanan.';
      primary_action := 'record_pay_at_store_payment'; previous_stage := 'Verifikasi Akhir & Harga';
      next_stage := 'Serah Terima / Pickup'; next_step := 'Barang dapat diserahkan setelah pembayaran terverifikasi.';
      blocking_reason := 'Pembayaran di toko belum tercatat.';
    elsif f.handover_completed_at is null then
      stage := 'pickup_handover'; admin_task_type := 'record_pickup_handover';
      customer_label := 'Serah Terima / Pickup'; admin_label := 'Selesaikan Serah Terima';
      customer_title := 'Pembayaran diterima';
      customer_description := 'Pembayaran sudah terverifikasi. Admin sedang menyelesaikan serah terima barang.';
      primary_action := 'record_pickup_handover'; previous_stage := 'Pembayaran di Toko'; next_stage := 'Selesai';
      next_step := 'Pesanan ditutup setelah bukti serah terima tersimpan.';
      blocking_reason := 'Serah terima belum dikonfirmasi.';
    else
      stage := 'pickup_completion'; admin_task_type := 'complete_pickup_order';
      customer_label := 'Serah Terima / Pickup'; admin_label := 'Tutup Pesanan Pickup';
      customer_title := 'Serah terima sudah dicatat';
      customer_description := 'Barang sudah diserahkan. Admin sedang menutup pesanan sebagai selesai.';
      primary_action := 'complete_pickup_order'; previous_stage := 'Serah Terima / Pickup'; next_stage := 'Selesai';
      next_step := 'Status akhir akan tersimpan sebagai Selesai.';
      blocking_reason := 'Penyelesaian terminal belum dikonfirmasi.';
    end if;

  elsif f.status = 'ready_for_pickup' then
    stage := 'ready_for_pickup'; responsibility := 'customer'; responsibility_label := 'TINDAKAN ANDA'; tone := 'action';
    admin_task_type := 'handover_pickup'; customer_label := 'Barang Siap Diambil'; admin_label := 'Menunggu Serah Terima';
    customer_title := 'Barang siap diambil';
    customer_description := 'Hubungi Admin sebelum berangkat dan tunjukkan nomor pesanan saat tiba di toko.';
    primary_action := 'handover_pickup'; previous_stage := 'Pengecekan Akhir'; next_stage := 'Serah Terima';
    next_step := 'Setelah barang diserahkan, pesanan akan ditandai selesai.';
    blocking_reason := null; revision := coalesce(f.updated_at::text, f.id::text);

  elsif f.status in ('ready_to_ship', 'shipped', 'in_transit') then
    stage := case when f.status = 'ready_to_ship' then 'ready_to_ship' else 'shipping' end;
    responsibility := case when f.status = 'ready_to_ship' then 'debroder' else 'none' end;
    responsibility_label := case when f.status = 'ready_to_ship' then 'SEDANG DIPROSES DEBRODER' else 'TIDAK ADA TINDAKAN YANG DIPERLUKAN' end;
    tone := 'processing'; admin_task_type := case when f.status = 'ready_to_ship' then 'dispatch_shipping' else null end;
    customer_label := case when f.status = 'ready_to_ship' then 'Siap Dikirim' else 'Sedang Dikirim' end;
    admin_label := case when f.status = 'ready_to_ship' then 'Serahkan ke Kurir' else 'Pengiriman Berjalan' end;
    customer_title := case when f.status = 'ready_to_ship' then 'Pesanan siap dikirim' else 'Pesanan sedang dikirim' end;
    customer_description := case when f.status = 'ready_to_ship'
      then 'Paket telah melalui pengecekan akhir dan menunggu diserahkan kepada kurir.'
      else 'Paket sudah diserahkan kepada kurir dan sedang menuju alamat penerima.' end;
    primary_action := case when f.status = 'ready_to_ship' then 'dispatch_order' else 'track_only' end;
    previous_stage := 'Pengecekan Akhir'; next_stage := case when f.status = 'ready_to_ship' then 'Pengiriman' else 'Pesanan Diterima' end;
    next_step := case when f.tracking_number is not null then 'Gunakan nomor resi untuk memantau paket sampai diterima.' else 'Nomor resi akan tampil setelah tersedia.' end;
    blocking_reason := null; revision := coalesce(f.updated_at::text, f.id::text);

  elsif f.status = 'packing' and is_pay_at_store and is_pickup then
    stage := 'preparing_goods'; responsibility := 'debroder'; responsibility_label := 'SEDANG DIPROSES DEBRODER'; tone := 'processing';
    admin_task_type := 'prepare_ready_stock'; customer_label := 'Persiapan / Produksi'; admin_label := 'Siapkan Barang Pickup';
    customer_title := 'Barang sedang disiapkan untuk diambil';
    customer_description := 'Anda belum perlu datang ke toko. Tim DEBRODER sedang menyiapkan barang dan lokasi pickup.';
    primary_action := 'prepare_goods'; previous_stage := 'Pesanan Masuk'; next_stage := 'Siap Diambil';
    next_step := 'Verifikasi akhir dilakukan setelah barang siap dan Anda tiba di toko.';
    blocking_reason := null; revision := coalesce(f.updated_at::text, f.id::text);

  elsif f.status = 'packing' then
    stage := case when f.final_verified_at is null then 'final_check' else 'final_check_completed' end;
    responsibility := 'debroder'; responsibility_label := 'SEDANG DIPROSES DEBRODER'; tone := 'processing';
    admin_task_type := 'run_final_check';
    customer_label := case when f.final_verified_at is null then 'Pengecekan Akhir' else 'Pengecekan Akhir Selesai' end;
    admin_label := case when f.final_verified_at is null then 'Lakukan Pengecekan Akhir'
      when f.method = 'pickup' then 'Tandai Barang Siap Diambil' else 'Tandai Pesanan Siap Dikirim' end;
    customer_title := case when f.final_verified_at is null then 'Pesanan sedang melalui pengecekan akhir' else 'Pengecekan akhir selesai' end;
    customer_description := case when f.final_verified_at is null
      then 'Tim DEBRODER sedang mencocokkan produk, jumlah, penerima, dan kondisi paket sebelum penyerahan.'
      else 'Paket telah diperiksa dan sedang disiapkan untuk tahap penyerahan.' end;
    primary_action := 'run_final_check'; previous_stage := 'Pengemasan';
    next_stage := case when f.method = 'pickup' then 'Siap Diambil' else 'Siap Dikirim' end;
    next_step := case when f.final_verified_at is null
      then 'Setelah checklist lengkap, pesanan dapat masuk ke tahap penyerahan.'
      when f.method = 'pickup' then 'Admin akan mengubah status menjadi siap diambil.'
      else 'Admin akan mengubah status menjadi siap dikirim.' end;
    blocking_reason := case when f.final_verified_at is null then 'Checklist pengecekan akhir belum selesai.' else 'Status penyerahan belum diperbarui.' end;
    revision := coalesce(f.updated_at::text, f.id::text);

  elsif o.status in ('ready_for_production', 'in_production', 'production', 'proses_produksi', 'masuk_produksi')
     or j.status in ('ready', 'released', 'in_progress', 'started', 'production', 'in_production') then
    stage := 'production'; responsibility := 'debroder'; responsibility_label := 'SEDANG DIPROSES DEBRODER'; tone := 'processing';
    admin_task_type := 'run_production'; customer_label := 'Produksi'; admin_label := 'Produksi Berjalan';
    customer_title := 'Pesanan sedang diproduksi'; customer_description := 'Tim produksi sedang mengerjakan pesanan berdasarkan spesifikasi yang telah disetujui.';
    primary_action := 'run_production'; previous_stage := 'Surat Perintah Kerja'; next_stage := 'Pemeriksaan Kualitas';
    next_step := 'Hasil produksi akan masuk ke pemeriksaan kualitas.'; blocking_reason := null;
    revision := coalesce(j.updated_at::text, j.id::text, revision);

  elsif o.status in ('quality_control', 'quality_check')
     or (is_custom and j.status in ('completed', 'done') and (q.id is null or not (q.status = 'finalized' and q.result = 'passed'))) then
    stage := 'quality_control'; responsibility := 'debroder'; responsibility_label := 'SEDANG DIPROSES DEBRODER'; tone := 'processing';
    admin_task_type := 'run_quality_control'; customer_label := 'Pemeriksaan Kualitas'; admin_label := 'Lakukan Pemeriksaan Kualitas';
    customer_title := 'Pemeriksaan kualitas'; customer_description := 'Tim DEBRODER sedang memastikan hasil sesuai spesifikasi pesanan.';
    primary_action := 'run_quality_control'; previous_stage := case when is_custom then 'Produksi' else 'Persiapan Barang' end;
    next_stage := 'Pengemasan'; next_step := 'Pesanan akan dikemas setelah lulus pemeriksaan kualitas.';
    blocking_reason := null; revision := coalesce(q.updated_at::text, q.id::text, j.updated_at::text, j.id::text, revision);

  elsif o.payment_requirement_met or o.payment_status in ('paid', 'verified', 'terverifikasi') then
    responsibility := 'debroder'; responsibility_label := 'SEDANG DIPROSES DEBRODER'; tone := 'processing'; blocking_reason := null;
    if is_custom and (j.id is null or j.status = 'draft') then
      stage := 'job_order_required'; admin_task_type := 'create_job_order'; customer_label := 'Pembayaran Terverifikasi';
      admin_label := 'Buat Surat Perintah Kerja'; customer_title := 'Pembayaran terverifikasi';
      customer_description := 'Dana sudah dikonfirmasi. Tim DEBRODER sedang menyiapkan Surat Perintah Kerja.';
      primary_action := 'create_job_order'; previous_stage := 'Pembayaran Terverifikasi'; next_stage := 'Produksi';
      next_step := 'Pesanan akan masuk ke produksi setelah Surat Perintah Kerja diterbitkan.';
    elsif is_custom and j.status in ('completed', 'done') and q.status = 'finalized' and q.result = 'passed' then
      stage := 'packing'; admin_task_type := 'pack_order'; customer_label := 'Pengemasan'; admin_label := 'Siapkan Pengemasan';
      customer_title := 'Pesanan siap dikemas'; customer_description := 'Produksi dan pemeriksaan kualitas selesai. Tim DEBRODER sedang menyiapkan pengemasan.';
      primary_action := 'pack_order'; previous_stage := 'Pemeriksaan Kualitas'; next_stage := 'Pengecekan Akhir';
      next_step := 'Setelah dikemas, pesanan masuk ke pengecekan akhir.'; revision := coalesce(f.updated_at::text, f.id::text, j.updated_at::text, j.id::text, revision);
    else
      stage := 'preparing_goods'; admin_task_type := 'prepare_ready_stock'; customer_label := 'Persiapan Barang'; admin_label := 'Siapkan Barang';
      customer_title := 'Barang sedang disiapkan'; customer_description := 'Tim DEBRODER sedang memastikan produk, warna, ukuran, jumlah, dan kondisi barang.';
      primary_action := 'prepare_goods'; previous_stage := 'Pembayaran Terverifikasi';
      next_stage := case when is_pickup then 'Siap Diambil' else 'Pemeriksaan Barang' end;
      next_step := case when is_pickup then 'Barang akan dinyatakan siap setelah pemeriksaan selesai.' else 'Barang akan diperiksa sebelum dikemas.' end;
      revision := coalesce(f.updated_at::text, f.id::text, revision);
    end if;

  elsif coalesce(p.status, '') = 'pending' or o.payment_status in ('pending_verification', 'menunggu_verifikasi') then
    stage := 'payment_review'; responsibility := 'debroder'; responsibility_label := 'SEDANG DIPROSES DEBRODER'; tone := 'processing';
    admin_task_type := 'review_payment'; customer_label := 'Pembayaran Sedang Diperiksa'; admin_label := 'Periksa Pembayaran';
    customer_title := 'Pembayaran sedang diperiksa'; customer_description := 'Bukti sudah diterima. Admin sedang mencocokkannya dengan mutasi rekening DEBRODER.';
    primary_action := 'review_payment'; previous_stage := 'Bukti Pembayaran Dikirim';
    next_stage := case when is_custom then 'Surat Perintah Kerja' else 'Persiapan Barang' end;
    next_step := case when is_custom then 'Setelah dana ditemukan, pesanan masuk ke Surat Perintah Kerja.' else 'Setelah dana ditemukan, pesanan masuk ke Persiapan Barang.' end;
    blocking_reason := 'Bukti pembayaran belum menjadi konfirmasi dana masuk.'; revision := coalesce(p.updated_at::text, p.id::text, revision);

  elsif coalesce(p.review_outcome, '') in ('funds_not_found', 'correction_required', 'rejected', 'proof_unclear')
     or o.payment_status in ('rejected', 'ditolak') then
    stage := 'payment_correction'; responsibility := 'customer'; responsibility_label := 'TINDAKAN ANDA'; tone := 'warning';
    admin_task_type := null; customer_label := 'Perbaiki Pembayaran'; admin_label := 'Menunggu Perbaikan Pelanggan';
    customer_title := 'Pembayaran perlu diperbaiki'; customer_description := 'Periksa catatan Admin, lalu kirim kembali laporan pembayaran melalui pesanan yang sama.';
    primary_action := 'resubmit_payment'; previous_stage := 'Pemeriksaan Pembayaran'; next_stage := 'Pemeriksaan Ulang';
    next_step := 'Bukti baru akan diperiksa kembali melalui mutasi rekening.'; blocking_reason := 'Data atau bukti pembayaran belum dapat diverifikasi.';
    revision := coalesce(p.updated_at::text, p.id::text, revision);

  elsif o.payment_status = 'partially_paid' then
    stage := 'payment_balance_due'; responsibility := 'customer'; responsibility_label := 'TINDAKAN ANDA'; tone := 'action';
    admin_task_type := null; customer_label := 'Sisa Pembayaran'; admin_label := 'Menunggu Sisa Pembayaran';
    customer_title := 'Selesaikan sisa pembayaran'; customer_description := 'Sebagian pembayaran sudah terverifikasi. Bayar sisa tagihan melalui tautan pesanan yang sama.';
    primary_action := 'open_payment'; previous_stage := 'Pembayaran Sebagian';
    next_stage := case when is_custom then 'Surat Perintah Kerja' else 'Persiapan Barang' end;
    next_step := 'Setelah syarat pembayaran terpenuhi, pesanan dapat dilanjutkan.'; blocking_reason := 'Syarat pembayaran belum terpenuhi.';

  elsif o.status = 'awaiting_payment' and not is_pay_at_store then
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

  elsif o.status = 'awaiting_customer_approval' then
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

  elsif o.status = 'pending_confirmation' or (o.status = 'baru' and o.whatsapp_confirmed_at is null) then
    stage := 'whatsapp_confirmation'; responsibility := 'customer'; responsibility_label := 'TINDAKAN ANDA'; tone := 'action';
    admin_task_type := null; customer_label := 'Verifikasi WhatsApp'; admin_label := 'Menunggu Verifikasi Pelanggan';
    customer_title := 'Verifikasi nomor WhatsApp'; customer_description := 'Konfirmasi nomor yang digunakan saat checkout agar pesanan dapat diproses dengan aman.';
    primary_action := 'verify_whatsapp'; previous_stage := 'Pesanan Dibuat'; next_stage := 'Pemeriksaan Pesanan';
    next_step := case when is_custom then 'Admin akan memeriksa pesanan custom.' else 'Stok akan diperiksa dan disimpan sementara.' end;
    blocking_reason := 'Nomor WhatsApp pelanggan belum terverifikasi.';

  elsif o.status = 'awaiting_shipping_quote' then
    stage := 'shipping_quote'; responsibility := 'debroder'; responsibility_label := 'SEDANG DIPROSES DEBRODER'; tone := 'processing';
    admin_task_type := 'set_shipping_quote'; customer_label := 'Ongkir Sedang Ditetapkan'; admin_label := 'Tetapkan Ongkir';
    customer_title := 'Ongkir sedang ditetapkan'; customer_description := 'Admin sedang memilih kurir, layanan, biaya, dan estimasi pengiriman.';
    primary_action := 'set_shipping_quote'; previous_stage := 'Pesanan Diterima'; next_stage := 'Persetujuan Total';
    next_step := 'Anda akan diminta memeriksa dan menyetujui total akhir.'; blocking_reason := null;

  elsif o.status in ('under_review', 'baru') then
    stage := case when is_custom and o.custom_quote_status = 'draft' then 'custom_pricing' else 'order_review' end;
    responsibility := 'debroder'; responsibility_label := 'SEDANG DIPROSES DEBRODER'; tone := 'processing';
    admin_task_type := case when is_custom and o.custom_quote_status = 'draft' then 'prepare_custom_quote'
                            when is_custom then 'review_custom_order' else 'review_new_order' end;
    customer_label := case when is_custom then 'Pesanan Custom Sedang Diperiksa' else 'Pesanan Sedang Diperiksa' end;
    admin_label := case when is_custom and o.custom_quote_status = 'draft' then 'Tetapkan Harga'
                        when is_custom then 'Periksa Pesanan Custom' else 'Periksa Pesanan Baru' end;
    customer_title := case when is_custom then 'Pesanan custom sedang diperiksa' else 'Pesanan sedang diperiksa' end;
    customer_description := case when is_custom
      then 'Admin sedang memeriksa produk, layanan, file, desain, waktu pengerjaan, dan harga.'
      else 'Admin sedang memeriksa data pesanan dan ketersediaan barang.' end;
    primary_action := case when is_custom and o.custom_quote_status = 'draft' then 'prepare_quote' else 'review_order' end;
    previous_stage := 'Pesanan Diterima';
    next_stage := case when is_custom then 'Penetapan Harga' when is_shipping then 'Penetapan Ongkir'
                       when is_pay_at_store then 'Persiapan Barang' else 'Pembayaran' end;
    next_step := case when is_custom then 'Berikutnya adalah penetapan harga.' else 'Berikutnya adalah konfirmasi stok dan metode penyerahan.' end;
    blocking_reason := null;

  elsif is_pay_at_store and is_pickup then
    stage := 'preparing_goods'; responsibility := 'debroder'; responsibility_label := 'SEDANG DIPROSES DEBRODER'; tone := 'processing';
    admin_task_type := 'prepare_ready_stock'; customer_label := 'Persiapan / Produksi'; admin_label := 'Siapkan Barang Pickup';
    customer_title := 'Barang sedang disiapkan untuk diambil'; customer_description := 'Anda belum perlu melakukan transfer. Tunggu konfirmasi barang siap sebelum datang ke toko.';
    primary_action := 'prepare_goods'; previous_stage := 'Pesanan Masuk'; next_stage := 'Siap Diambil';
    next_step := 'Pembayaran dilakukan di toko setelah verifikasi akhir saat Anda tiba.'; blocking_reason := null;
  end if;

  return jsonb_build_object(
    'activeStage', stage,
    'lifecycleKind', case when is_custom then 'custom' else 'ready_stock' end,
    'responsibility', responsibility,
    'responsibilityLabel', responsibility_label,
    'tone', tone,
    'customerStatusLabel', customer_label,
    'adminStatusLabel', admin_label,
    'customerTitle', customer_title,
    'customerDescription', customer_description,
    'adminTaskType', admin_task_type,
    'primaryAction', primary_action,
    'secondaryAction', secondary_action,
    'previousStage', previous_stage,
    'nextStage', next_stage,
    'nextStep', next_step,
    'blockingReason', blocking_reason,
    'warning', warning_text,
    'warnings', warnings_json,
    'taskKey', case when admin_task_type is null then null else format('order:%s:%s:%s', o.id, admin_task_type, revision) end,
    'isTerminal', terminal,
    'orderUpdatedAt', o.updated_at
  );
end
$$;

revoke all on function public._evaluate_order_integrity_v1(uuid) from public, anon, authenticated;
grant execute on function public._evaluate_order_integrity_v1(uuid) to service_role;
revoke all on function public._resolve_order_active_stage_v1(uuid) from public, anon, authenticated;
grant execute on function public._resolve_order_active_stage_v1(uuid) to service_role;

create or replace function public.guard_pay_at_store_pickup_progress_v1()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  order_value public.orders;
begin
  if new.status is not distinct from old.status
     or not (old.status = 'ready_for_pickup' and new.status = 'picked_up') then
    return new;
  end if;

  select *
  into order_value
  from public.orders
  where id = new.order_id;

  if new.method = 'pickup' and order_value.payment_method = 'pay_at_store' then
    if new.customer_arrived_at is null then
      raise exception 'Kedatangan pelanggan belum dikonfirmasi';
    end if;
    if new.final_verified_at is null then
      raise exception 'Verifikasi akhir dan harga belum selesai';
    end if;
    if new.handover_completed_at is null then
      raise exception 'Serah terima belum dikonfirmasi';
    end if;
    if not exists (
      select 1
      from public.order_payments payment
      where payment.order_id = new.order_id
        and payment.archived_at is null
        and (payment.status = 'verified' or payment.review_outcome = 'verified')
    ) then
      raise exception 'Pembayaran di toko belum terverifikasi';
    end if;
    if not exists (
      select 1
      from public.fulfillment_files proof
      where proof.fulfillment_id = new.id
        and proof.file_type in ('handover', 'signature', 'photo')
    ) then
      raise exception 'Bukti serah terima belum tersedia';
    end if;
  end if;

  return new;
end
$$;

drop trigger if exists guard_pay_at_store_pickup_progress_v1 on public.fulfillments;
create trigger guard_pay_at_store_pickup_progress_v1
before update of status on public.fulfillments
for each row execute function public.guard_pay_at_store_pickup_progress_v1();

create or replace function public.mark_pickup_ready_v1(
  p_preparation_id uuid,
  p_deadline_hours integer default 72
)
returns public.pickup_preparations
language plpgsql
security definer
set search_path = ''
as $$
declare
  prep public.pickup_preparations;
  order_value public.orders;
  fulfillment_value public.fulfillments;
begin
  if not public.has_permission('inventory.location.manage') then
    raise exception 'Tidak berwenang menetapkan pickup siap';
  end if;
  if p_deadline_hours < 12 or p_deadline_hours > 168 then
    raise exception 'Batas pickup harus 12 sampai 168 jam';
  end if;

  select * into prep
  from public.pickup_preparations
  where id = p_preparation_id
  for update;
  if not found then raise exception 'Persiapan pickup tidak ditemukan'; end if;

  select * into order_value
  from public.orders
  where id = prep.order_id
  for update;
  if not found then raise exception 'Pesanan pickup tidak ditemukan'; end if;

  select * into fulfillment_value
  from public.fulfillments
  where id = prep.fulfillment_id
  for update;
  if not found then raise exception 'Fulfillment pickup tidak ditemukan'; end if;

  if order_value.status in ('completed', 'selesai')
     or prep.status = 'handed_over'
     or fulfillment_value.status in ('picked_up', 'delivered') then
    raise exception 'Pesanan sudah selesai dan pickup tidak dapat dibuka kembali';
  end if;
  if order_value.status in ('cancelled', 'dibatalkan', 'expired')
     or prep.status = 'cancelled' then
    raise exception 'Pesanan terminal tidak dapat diproses sebagai pickup';
  end if;

  if prep.status = 'ready_for_pickup' then
    return prep;
  end if;
  if prep.status <> 'checking' then
    raise exception 'Persiapan pickup tidak dapat diproses pada status ini';
  end if;
  if exists (
    select 1
    from public.pickup_preparation_items
    where preparation_id = prep.id
      and reserved_quantity < required_quantity
  ) then
    raise exception 'Stok fisik di lokasi pickup belum lengkap';
  end if;
  if fulfillment_value.final_verified_at is null
     and not (
       fulfillment_value.method = 'pickup'
       and order_value.payment_method = 'pay_at_store'
     ) then
    raise exception 'Pengecekan akhir fulfillment wajib selesai';
  end if;

  update public.pickup_preparations
  set status = 'ready_for_pickup',
      ready_at = now(),
      pickup_deadline = now() + make_interval(hours => p_deadline_hours),
      reminder_at = now() + make_interval(hours => greatest(p_deadline_hours - 24, 1)),
      reminder_sent_at = null,
      updated_at = now(),
      updated_by = auth.uid()
  where id = prep.id
  returning * into prep;

  update public.fulfillments
  set status = 'ready_for_pickup',
      ready_at = coalesce(ready_at, now()),
      updated_at = now(),
      updated_by = auth.uid()
  where id = fulfillment_value.id
    and status not in ('picked_up', 'delivered')
  returning * into fulfillment_value;

  insert into public.fulfillment_status_history(
    fulfillment_id, from_status, to_status, note, changed_by, metadata
  )
  select
    fulfillment_value.id,
    'packing',
    'ready_for_pickup',
    'Barang pickup siap diambil',
    auth.uid(),
    jsonb_build_object('event', 'pickup_ready_for_customer')
  where not exists (
    select 1
    from public.fulfillment_status_history history
    where history.fulfillment_id = fulfillment_value.id
      and history.to_status = 'ready_for_pickup'
      and history.metadata->>'event' = 'pickup_ready_for_customer'
  );

  perform public.sync_order_handoff_v2(prep.order_id, null);
  return prep;
end
$$;

create or replace function public.begin_pickup_final_verification_v1(
  p_fulfillment_id uuid,
  p_note text default null,
  p_expected_updated_at timestamptz default null
)
returns public.fulfillments
language plpgsql
security definer
set search_path = ''
as $$
declare
  fulfillment_value public.fulfillments;
  order_value public.orders;
begin
  if not public.has_permission('shipping.update')
     and not public.has_permission('operations.manage') then
    raise exception 'Tidak berwenang mengonfirmasi kedatangan pelanggan';
  end if;

  select * into fulfillment_value
  from public.fulfillments
  where id = p_fulfillment_id and archived_at is null
  for update;
  if not found then raise exception 'Dokumen pickup tidak ditemukan'; end if;

  select * into order_value
  from public.orders
  where id = fulfillment_value.order_id
  for update;
  if not found then raise exception 'Pesanan tidak ditemukan'; end if;

  if fulfillment_value.customer_arrived_at is not null then
    return fulfillment_value;
  end if;
  if fulfillment_value.method <> 'pickup'
     or order_value.payment_method <> 'pay_at_store'
     or fulfillment_value.status <> 'ready_for_pickup' then
    raise exception 'Kedatangan pelanggan hanya tersedia untuk pickup Pay at Store yang sudah siap';
  end if;
  if p_expected_updated_at is not null
     and fulfillment_value.updated_at is distinct from p_expected_updated_at then
    raise exception 'Data ini telah diperbarui oleh admin lain';
  end if;

  update public.fulfillments
  set customer_arrived_at = now(),
      customer_arrived_by = auth.uid(),
      customer_arrival_note = nullif(btrim(coalesce(p_note, '')), ''),
      updated_at = now(),
      updated_by = auth.uid()
  where id = fulfillment_value.id
  returning * into fulfillment_value;

  insert into public.fulfillment_status_history(
    fulfillment_id, from_status, to_status, note, changed_by, metadata
  ) values (
    fulfillment_value.id,
    'ready_for_pickup',
    'ready_for_pickup',
    'Pelanggan tiba; verifikasi akhir dimulai',
    auth.uid(),
    jsonb_build_object('event', 'pickup_customer_arrived')
  );

  perform public.sync_order_handoff_v2(order_value.id, null);
  return fulfillment_value;
end
$$;

create or replace function public.complete_fulfillment_final_verification(
  p_fulfillment_id uuid,
  p_checklist jsonb,
  p_note text,
  p_expected_updated_at timestamptz
)
returns public.fulfillments
language plpgsql
security definer
set search_path = ''
as $$
declare
  result_row public.fulfillments;
  order_row public.orders;
  required_key text;
  is_custom boolean;
  is_pay_at_store_pickup boolean;
begin
  if not public.has_permission('shipping.update') then
    raise exception 'Tidak berwenang melakukan pengecekan akhir';
  end if;

  select * into result_row
  from public.fulfillments
  where id = p_fulfillment_id and archived_at is null
  for update;
  if not found then raise exception 'Dokumen penyerahan tidak ditemukan'; end if;

  select * into order_row
  from public.orders
  where id = result_row.order_id
  for update;
  if not found then raise exception 'Pesanan tidak ditemukan'; end if;

  is_pay_at_store_pickup := result_row.method = 'pickup'
    and order_row.payment_method = 'pay_at_store';

  if result_row.final_verified_at is not null then
    return result_row;
  end if;
  if is_pay_at_store_pickup then
    if result_row.status <> 'ready_for_pickup'
       or result_row.customer_arrived_at is null then
      raise exception 'Verifikasi akhir tersedia setelah pickup siap dan pelanggan tiba';
    end if;
  elsif result_row.status <> 'packing' then
    raise exception 'Pengecekan akhir hanya tersedia setelah packing';
  end if;
  if result_row.updated_at is distinct from p_expected_updated_at then
    raise exception 'Data ini telah diperbarui oleh admin lain';
  end if;
  if not coalesce(order_row.payment_production_eligible, false)
     and not is_pay_at_store_pickup then
    raise exception 'Syarat pembayaran belum terpenuhi';
  end if;
  if coalesce(jsonb_typeof(p_checklist), '') <> 'object' then
    raise exception 'Checklist pengecekan akhir tidak valid';
  end if;

  is_custom := case
    when jsonb_typeof(order_row.custom_project_snapshot) = 'array'
      then jsonb_array_length(order_row.custom_project_snapshot) > 0
    else false
  end;

  foreach required_key in array array[
    'order_number', 'customer', 'phone', 'product', 'variant', 'color', 'size',
    'quantity', 'package_content', 'package_count', 'fulfillment_method', 'package_condition'
  ] loop
    if coalesce((p_checklist->>required_key)::boolean, false) is not true then
      raise exception 'Checklist pengecekan akhir belum lengkap';
    end if;
  end loop;

  if is_custom then
    foreach required_key in array array[
      'method', 'design', 'placement', 'print_size', 'personalization', 'qc'
    ] loop
      if coalesce((p_checklist->>required_key)::boolean, false) is not true then
        raise exception 'Checklist Custom dan QC belum lengkap';
      end if;
    end loop;
  end if;

  if result_row.method = 'shipping' then
    foreach required_key in array array['recipient_address', 'postal_code'] loop
      if coalesce((p_checklist->>required_key)::boolean, false) is not true then
        raise exception 'Checklist penerima pengiriman belum lengkap';
      end if;
    end loop;
  end if;

  update public.fulfillments
  set final_verification_checklist = p_checklist,
      final_verified_at = now(),
      final_verified_by = auth.uid(),
      final_verification_note = nullif(btrim(coalesce(p_note, '')), ''),
      updated_by = auth.uid(),
      updated_at = now()
  where id = result_row.id
  returning * into result_row;

  insert into public.fulfillment_status_history(
    fulfillment_id, from_status, to_status, note, changed_by, metadata
  ) values (
    result_row.id,
    result_row.status,
    result_row.status,
    'Pengecekan akhir fulfillment selesai',
    auth.uid(),
    jsonb_build_object(
      'event', 'fulfillment_final_verification_completed',
      'is_custom', is_custom,
      'payment_method', order_row.payment_method
    )
  );

  perform public.sync_order_handoff_v2(order_row.id, null);
  return result_row;
end
$$;

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
begin
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

  select * into payment_value
  from public.create_order_payment(
    order_value.id,
    order_value.payment_balance,
    now(),
    'cash',
    'Pickup Toko',
    null,
    null,
    coalesce(nullif(btrim(coalesce(p_admin_notes, '')), ''), 'Pembayaran penuh diterima saat pickup'),
    null,
    null,
    null,
    null
  );
  perform public.verify_order_payment(
    payment_value.id,
    'Diverifikasi setelah pelanggan tiba dan verifikasi akhir selesai'
  );

  select * into payment_value
  from public.order_payments
  where id = payment_value.id;

  perform public.sync_order_handoff_v2(order_value.id, null);
  return payment_value;
end
$$;

create or replace function public.record_pickup_handover_v1(
  p_fulfillment_id uuid,
  p_note text default null,
  p_expected_updated_at timestamptz default null
)
returns public.fulfillments
language plpgsql
security definer
set search_path = ''
as $$
declare
  fulfillment_value public.fulfillments;
  order_value public.orders;
begin
  if not public.has_permission('shipping.complete')
     and not public.has_permission('operations.manage') then
    raise exception 'Tidak berwenang menyelesaikan serah terima';
  end if;

  select * into fulfillment_value
  from public.fulfillments
  where id = p_fulfillment_id and archived_at is null
  for update;
  if not found then raise exception 'Dokumen pickup tidak ditemukan'; end if;

  select * into order_value
  from public.orders
  where id = fulfillment_value.order_id
  for update;
  if not found then raise exception 'Pesanan pickup tidak ditemukan'; end if;

  if fulfillment_value.handover_completed_at is not null then
    return fulfillment_value;
  end if;
  if fulfillment_value.method <> 'pickup'
     or order_value.payment_method <> 'pay_at_store'
     or fulfillment_value.status <> 'ready_for_pickup' then
    raise exception 'Serah terima hanya tersedia untuk pickup Pay at Store yang sudah siap';
  end if;
  if fulfillment_value.customer_arrived_at is null
     or fulfillment_value.final_verified_at is null then
    raise exception 'Kedatangan dan verifikasi akhir belum selesai';
  end if;
  if not exists (
    select 1 from public.order_payments payment
    where payment.order_id = order_value.id
      and payment.archived_at is null
      and (payment.status = 'verified' or payment.review_outcome = 'verified')
  ) then
    raise exception 'Pembayaran di toko belum terverifikasi';
  end if;
  if not exists (
    select 1 from public.fulfillment_files proof
    where proof.fulfillment_id = fulfillment_value.id
      and proof.file_type in ('handover', 'signature', 'photo')
  ) then
    raise exception 'Bukti serah terima belum tersedia';
  end if;
  if p_expected_updated_at is not null
     and fulfillment_value.updated_at is distinct from p_expected_updated_at then
    raise exception 'Data ini telah diperbarui oleh admin lain';
  end if;

  update public.fulfillments
  set handover_completed_at = now(),
      handover_completed_by = auth.uid(),
      handover_note = nullif(btrim(coalesce(p_note, '')), ''),
      updated_at = now(),
      updated_by = auth.uid()
  where id = fulfillment_value.id
  returning * into fulfillment_value;

  insert into public.fulfillment_status_history(
    fulfillment_id, from_status, to_status, note, changed_by, metadata
  ) values (
    fulfillment_value.id,
    'ready_for_pickup',
    'ready_for_pickup',
    'Serah terima pickup dikonfirmasi',
    auth.uid(),
    jsonb_build_object('event', 'pickup_handover_recorded')
  );

  perform public.sync_order_handoff_v2(order_value.id, null);
  return fulfillment_value;
end
$$;

create or replace function public.complete_pickup_order_v1(
  p_fulfillment_id uuid,
  p_note text default null,
  p_expected_updated_at timestamptz default null
)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  fulfillment_value public.fulfillments;
  order_value public.orders;
  preparation_value public.pickup_preparations;
begin
  if not public.has_permission('shipping.complete')
     and not public.has_permission('operations.manage') then
    raise exception 'Tidak berwenang menutup pesanan pickup';
  end if;

  select * into fulfillment_value
  from public.fulfillments
  where id = p_fulfillment_id and archived_at is null
  for update;
  if not found then raise exception 'Dokumen pickup tidak ditemukan'; end if;

  select * into order_value
  from public.orders
  where id = fulfillment_value.order_id
  for update;
  if not found then raise exception 'Pesanan pickup tidak ditemukan'; end if;

  if order_value.status in ('completed', 'selesai')
     and fulfillment_value.status = 'picked_up' then
    return order_value;
  end if;
  if fulfillment_value.method <> 'pickup'
     or order_value.payment_method <> 'pay_at_store'
     or fulfillment_value.status <> 'ready_for_pickup' then
    raise exception 'Pesanan belum berada pada tahap penutupan pickup';
  end if;
  if fulfillment_value.customer_arrived_at is null
     or fulfillment_value.final_verified_at is null
     or fulfillment_value.handover_completed_at is null then
    raise exception 'Milestone pickup belum lengkap';
  end if;
  if p_expected_updated_at is not null
     and fulfillment_value.updated_at is distinct from p_expected_updated_at then
    raise exception 'Data ini telah diperbarui oleh admin lain';
  end if;

  select * into preparation_value
  from public.pickup_preparations
  where fulfillment_id = fulfillment_value.id
  for update;
  if not found then raise exception 'Persiapan pickup tidak ditemukan'; end if;

  order_value := public.complete_pickup_handover_v1(
    preparation_value.id,
    coalesce(nullif(btrim(coalesce(p_note, '')), ''), 'Pickup Pay at Store selesai')
  );

  insert into public.fulfillment_status_history(
    fulfillment_id, from_status, to_status, note, changed_by, metadata
  )
  select
    fulfillment_value.id,
    'ready_for_pickup',
    'picked_up',
    'Pickup selesai dan order ditutup',
    auth.uid(),
    jsonb_build_object('event', 'pickup_order_completed')
  where not exists (
    select 1 from public.fulfillment_status_history history
    where history.fulfillment_id = fulfillment_value.id
      and history.to_status = 'picked_up'
      and history.metadata->>'event' = 'pickup_order_completed'
  );

  perform public.sync_order_handoff_v2(order_value.id, null);
  return order_value;
end
$$;

revoke all on function public.begin_pickup_final_verification_v1(uuid, text, timestamptz) from public, anon;
revoke all on function public.record_pay_at_store_payment_v1(uuid, text, timestamptz) from public, anon;
revoke all on function public.record_pickup_handover_v1(uuid, text, timestamptz) from public, anon;
revoke all on function public.complete_pickup_order_v1(uuid, text, timestamptz) from public, anon;
revoke all on function public.guard_pay_at_store_pickup_progress_v1() from public, anon, authenticated;

grant execute on function public.begin_pickup_final_verification_v1(uuid, text, timestamptz) to authenticated, service_role;
grant execute on function public.record_pay_at_store_payment_v1(uuid, text, timestamptz) to authenticated, service_role;
grant execute on function public.record_pickup_handover_v1(uuid, text, timestamptz) to authenticated, service_role;
grant execute on function public.complete_pickup_order_v1(uuid, text, timestamptz) to authenticated, service_role;
grant execute on function public.guard_pay_at_store_pickup_progress_v1() to service_role;

-- Keep integrity evaluation aligned with the canonical branch: Pay at Store
-- reaches ready_for_pickup before final verification, but later milestones
-- remain strict and auditable.
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
      or nullif(btrim(coalesce(verified_destination_account, '')), '') is null
      or nullif(btrim(coalesce(verified_reference, '')), '') is null
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

  if o.status in ('cancelled', 'dibatalkan', 'expired') and pending_payments > 0 then
    return query select 'terminal_pending_payment', 'critical', false,
      'Pesanan terminal masih memiliki pembayaran yang menunggu pemeriksaan.',
      jsonb_build_object('order_status', o.status, 'pending_payments', pending_payments);
  end if;
  if invalid_verified_payments > 0 then
    return query select 'verified_payment_missing_evidence', 'critical', true,
      'Pembayaran terverifikasi tidak memiliki checklist dan data mutasi lengkap.',
      jsonb_build_object('count', invalid_verified_payments);
  end if;
  if f.id is not null
     and f.status in ('packing', 'ready_to_ship', 'ready_for_pickup', 'shipped', 'in_transit', 'delivered', 'picked_up')
     and not o.payment_production_eligible
     and not (o.payment_method = 'pay_at_store' and f.method = 'pickup') then
    return query select 'fulfillment_before_payment', 'critical', true,
      'Fulfillment berjalan sebelum prasyarat pembayaran terpenuhi.',
      jsonb_build_object('fulfillment_id', f.id, 'fulfillment_status', f.status, 'payment_method', o.payment_method);
  end if;
  if f.id is not null
     and f.status in ('ready_to_ship', 'ready_for_pickup', 'shipped', 'in_transit', 'delivered', 'picked_up')
     and f.final_verified_at is null
     and not (
       o.payment_method = 'pay_at_store'
       and f.method = 'pickup'
       and f.status = 'ready_for_pickup'
     ) then
    return query select 'handover_without_final_check', 'critical', true,
      'Fulfillment mencapai tahap penyerahan tanpa bukti pengecekan akhir.',
      jsonb_build_object('fulfillment_id', f.id, 'fulfillment_status', f.status);
  end if;
  if f.id is not null
     and o.payment_method = 'pay_at_store'
     and f.method = 'pickup'
     and f.final_verified_at is not null
     and f.customer_arrived_at is null then
    return query select 'pickup_final_check_without_arrival', 'critical', true,
      'Verifikasi akhir pickup tercatat sebelum kedatangan pelanggan.',
      jsonb_build_object('fulfillment_id', f.id);
  end if;
  if f.id is not null
     and f.handover_completed_at is not null
     and (
       f.customer_arrived_at is null
       or f.final_verified_at is null
       or verified_payments = 0
     ) then
    return query select 'pickup_handover_missing_prerequisite', 'critical', true,
      'Serah terima pickup tercatat tanpa milestone atau pembayaran lengkap.',
      jsonb_build_object('fulfillment_id', f.id, 'verified_payments', verified_payments);
  end if;
  if o.status not in ('cancelled', 'dibatalkan', 'expired', 'awaiting_payment', 'processing')
     and pending_payments > 0 then
    return query select 'payment_review_order_status_mismatch', 'warning', false,
      'Pemeriksaan pembayaran aktif tetapi status order belum berada pada tahap pembayaran.',
      jsonb_build_object('order_status', o.status, 'pending_payments', pending_payments);
  end if;
  if o.payment_status in ('pending_verification', 'menunggu_verifikasi') and pending_payments = 0 then
    return query select 'pending_payment_summary_without_record', 'warning', false,
      'Ringkasan pembayaran menunggu pemeriksaan tanpa payment record pending.',
      jsonb_build_object('payment_status', o.payment_status);
  end if;
  if o.payment_requirement_met and verified_payments = 0
     and coalesce(o.payment_effective_total, 0) <= 0
     and o.payment_method <> 'pay_at_store' then
    return query select 'requirement_met_without_verified_payment', 'critical', true,
      'Syarat pembayaran terpenuhi tanpa pembayaran terverifikasi.',
      jsonb_build_object('payment_effective_total', o.payment_effective_total, 'payment_method', o.payment_method);
  end if;
  if o.payment_production_eligible and not o.payment_requirement_met
     and o.payment_method <> 'pay_at_store' then
    return query select 'eligible_without_payment_requirement', 'critical', true,
      'Pesanan dapat diproses sebelum syarat pembayaran terpenuhi.',
      jsonb_build_object('payment_required_amount', o.payment_required_amount, 'payment_effective_total', o.payment_effective_total);
  end if;
  if o.status in ('completed', 'selesai') and f.id is not null
     and f.status not in ('delivered', 'picked_up', 'cancelled') then
    return query select 'completed_with_open_fulfillment', 'critical', true,
      'Pesanan selesai tetapi fulfillment masih terbuka.',
      jsonb_build_object('fulfillment_id', f.id, 'fulfillment_status', f.status);
  end if;
  if f.id is not null and f.status in ('ready_for_pickup', 'picked_up') and f.method <> 'pickup' then
    return query select 'pickup_method_mismatch', 'critical', true,
      'Status pickup tidak cocok dengan metode fulfillment.',
      jsonb_build_object('fulfillment_id', f.id, 'method', f.method, 'status', f.status);
  end if;
  if f.id is not null and f.status in ('ready_to_ship', 'shipped', 'in_transit', 'delivered') and f.method <> 'shipping' then
    return query select 'shipping_method_mismatch', 'critical', true,
      'Status pengiriman tidak cocok dengan metode fulfillment.',
      jsonb_build_object('fulfillment_id', f.id, 'method', f.method, 'status', f.status);
  end if;
  if j.id is not null and not is_custom then
    return query select 'ready_stock_has_job_order', 'critical', true,
      'Ready Stock tidak boleh mempunyai Surat Perintah Kerja produksi.',
      jsonb_build_object('job_order_id', j.id, 'job_order_status', j.status);
  end if;
  if j.id is not null and j.status in ('ready', 'released', 'in_progress', 'production', 'in_production')
     and not o.payment_production_eligible then
    return query select 'custom_job_before_payment', 'critical', true,
      'Produksi Custom terbuka sebelum prasyarat pembayaran terpenuhi.',
      jsonb_build_object('job_order_id', j.id, 'job_order_status', j.status);
  end if;
  if active_reservations > 0 then
    return query select 'expired_reservation_still_active', 'warning', false,
      'Reservasi stok telah kedaluwarsa tetapi masih aktif.',
      jsonb_build_object('count', active_reservations);
  end if;
  if o.status = 'awaiting_payment' and o.payment_method = 'bank_transfer'
     and live_links = 0 and pending_payments = 0 and verified_payments = 0 then
    return query select 'awaiting_payment_without_live_link', 'warning', false,
      'Pesanan menunggu pembayaran tanpa tautan pembayaran aktif.',
      '{}'::jsonb;
  end if;
end
$$;
