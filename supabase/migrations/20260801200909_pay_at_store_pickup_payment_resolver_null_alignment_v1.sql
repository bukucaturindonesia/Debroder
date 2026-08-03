-- P0 Pay at Store pickup resolver parity hotfix.
-- When no order_payments row exists, nullable row fields must resolve to false
-- so the canonical stage remains pickup_payment until a verified payment exists.
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

  payment_verified := coalesce(o.payment_requirement_met, false)
    or coalesce(o.payment_status in ('paid', 'verified', 'terverifikasi'), false)
    or coalesce(p.status = 'verified', false)
    or coalesce(p.review_outcome = 'verified', false);

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

revoke all on function public._resolve_order_active_stage_v1(uuid) from public, anon, authenticated;
grant execute on function public._resolve_order_active_stage_v1(uuid) to service_role;

;
