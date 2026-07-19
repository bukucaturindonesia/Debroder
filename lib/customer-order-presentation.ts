export type CustomerOrderResponsibility = "customer" | "debroder" | "none";
export type CustomerOrderTone = "action" | "processing" | "success" | "warning";
export type CustomerOrderAction =
  | "verify_whatsapp"
  | "approve_quote"
  | "approve_total"
  | "pay"
  | "resubmit_payment"
  | "contact_admin"
  | "pickup"
  | "track_only"
  | null;

export type CustomerOrderPresentationInput = {
  status?: string | null;
  paymentStatus?: string | null;
  fulfillmentStatus?: string | null;
  fulfillmentMethod?: string | null;
  paymentMethod?: string | null;
  hasPaymentUrl?: boolean;
  isCustom?: boolean;
};

export type CustomerOrderPresentation = {
  responsibility: CustomerOrderResponsibility;
  responsibilityLabel: string;
  tone: CustomerOrderTone;
  title: string;
  description: string;
  nextStep: string;
  previousStage: string;
  currentStage: string;
  nextStage: string;
  action: CustomerOrderAction;
};

const SUCCESS_STATUSES = new Set(["completed", "selesai", "delivered", "picked_up"]);
const CANCELLED_STATUSES = new Set(["cancelled", "dibatalkan", "expired"]);
const PAYMENT_REVIEW_STATUSES = new Set(["pending", "pending_verification", "menunggu_verifikasi"]);
const PAYMENT_PAID_STATUSES = new Set(["paid", "verified", "terverifikasi"]);
const PAYMENT_REJECTED_STATUSES = new Set(["rejected", "ditolak"]);

function normalized(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function presentation(
  values: Omit<CustomerOrderPresentation, "responsibilityLabel">
): CustomerOrderPresentation {
  return {
    ...values,
    responsibilityLabel:
      values.responsibility === "customer"
        ? "TINDAKAN ANDA"
        : values.responsibility === "debroder"
          ? "SEDANG DIPROSES DEBRODER"
          : "TIDAK ADA TINDAKAN YANG DIPERLUKAN"
  };
}

export function resolveCustomerOrderPresentation(
  input: CustomerOrderPresentationInput
): CustomerOrderPresentation {
  const orderStatus = normalized(input.status);
  const fulfillmentStatus = normalized(input.fulfillmentStatus);
  const activeStatus = fulfillmentStatus || orderStatus;
  const paymentStatus = normalized(input.paymentStatus);
  const isPickup = normalized(input.fulfillmentMethod) === "pickup";
  const isPayAtStore = normalized(input.paymentMethod) === "pay_at_store";
  const postPaymentStage = input.isCustom ? "Surat Perintah Kerja" : "Persiapan barang";

  if (SUCCESS_STATUSES.has(activeStatus) || SUCCESS_STATUSES.has(orderStatus)) {
    return presentation({
      responsibility: "none",
      tone: "success",
      title: "Pesanan selesai",
      description: isPickup
        ? "Barang telah diserahkan. Simpan nomor pesanan untuk kebutuhan layanan setelah pembelian."
        : "Pesanan telah diterima. Simpan nomor pesanan untuk kebutuhan layanan setelah pembelian.",
      nextStep: "Tidak ada tindakan lanjutan yang diperlukan.",
      previousStage: isPickup ? "Barang siap diambil" : "Pengiriman",
      currentStage: "Selesai",
      nextStage: "Layanan setelah pembelian",
      action: "track_only"
    });
  }

  if (CANCELLED_STATUSES.has(activeStatus) || CANCELLED_STATUSES.has(orderStatus)) {
    return presentation({
      responsibility: "customer",
      tone: "warning",
      title: orderStatus === "expired" ? "Masa pesanan telah berakhir" : "Pesanan tidak aktif",
      description: "Hubungi Admin DEBRODER bila Anda masih ingin melanjutkan atau membuat pesanan baru.",
      nextStep: "Admin akan membantu memeriksa pilihan yang masih tersedia.",
      previousStage: "Pesanan dibuat",
      currentStage: orderStatus === "expired" ? "Kedaluwarsa" : "Dibatalkan",
      nextStage: "Hubungi Admin",
      action: "contact_admin"
    });
  }

  if (isPayAtStore && isPickup && ["ready_for_pickup", "siap_diambil"].includes(activeStatus)) {
    return presentation({
      responsibility: "customer",
      tone: "action",
      title: "Barang siap diambil dan dibayar di toko",
      description: "Hubungi Admin sebelum berangkat, lalu tunjukkan nomor pesanan saat tiba di toko.",
      nextStep: "Pembayaran dikonfirmasi oleh Admin setelah dana diterima di toko.",
      previousStage: "Barang disiapkan",
      currentStage: "Siap diambil",
      nextStage: "Bayar dan serah terima",
      action: "pickup"
    });
  }

  if (PAYMENT_REVIEW_STATUSES.has(paymentStatus)) {
    return presentation({
      responsibility: "debroder",
      tone: "processing",
      title: "Pembayaran sedang diperiksa",
      description: "Bukti sudah diterima. Admin sedang mencocokkannya dengan mutasi rekening DEBRODER.",
      nextStep: `Setelah dana ditemukan, pesanan masuk ke ${postPaymentStage}.`,
      previousStage: "Bukti pembayaran dikirim",
      currentStage: "Pemeriksaan pembayaran",
      nextStage: postPaymentStage,
      action: "track_only"
    });
  }

  if (PAYMENT_REJECTED_STATUSES.has(paymentStatus)) {
    return presentation({
      responsibility: "customer",
      tone: "warning",
      title: "Pembayaran perlu diperbaiki",
      description: "Periksa catatan Admin, lalu kirim kembali laporan pembayaran melalui pesanan yang sama.",
      nextStep: "Bukti baru akan diperiksa kembali melalui mutasi rekening.",
      previousStage: "Pemeriksaan pembayaran",
      currentStage: "Perbaiki pembayaran",
      nextStage: "Pemeriksaan ulang",
      action: "resubmit_payment"
    });
  }

  if (paymentStatus === "partially_paid") {
    return presentation({
      responsibility: "customer",
      tone: "action",
      title: "Selesaikan sisa pembayaran",
      description: "Sebagian pembayaran sudah terverifikasi. Bayar sisa tagihan melalui tautan pesanan yang sama.",
      nextStep: `Setelah syarat pembayaran terpenuhi, pesanan masuk ke ${postPaymentStage}.`,
      previousStage: "Pembayaran sebagian",
      currentStage: "Sisa pembayaran",
      nextStage: postPaymentStage,
      action: "pay"
    });
  }

  if (orderStatus === "pending_confirmation") {
    return presentation({
      responsibility: "customer",
      tone: "action",
      title: "Verifikasi nomor WhatsApp",
      description: "Konfirmasi nomor yang digunakan saat checkout agar pesanan dapat diproses dengan aman.",
      nextStep: input.isCustom ? "Admin akan memeriksa pesanan custom." : "Stok akan diperiksa dan disimpan sementara.",
      previousStage: "Pesanan dibuat",
      currentStage: "Verifikasi WhatsApp",
      nextStage: "Pemeriksaan pesanan",
      action: "verify_whatsapp"
    });
  }

  if (orderStatus === "awaiting_customer_approval") {
    return presentation({
      responsibility: "customer",
      tone: "action",
      title: input.isCustom ? "Periksa dan setujui penawaran" : "Periksa dan setujui total pesanan",
      description: input.isCustom
        ? "Pastikan produk, layanan, desain, jumlah, dan total penawaran sudah sesuai."
        : "Pastikan ongkir, layanan pengiriman, dan total akhir sudah sesuai.",
      nextStep: "Setelah disetujui, instruksi pembayaran akan tersedia.",
      previousStage: input.isCustom ? "Penetapan harga" : "Penetapan ongkir",
      currentStage: "Persetujuan Anda",
      nextStage: "Pembayaran",
      action: input.isCustom ? "approve_quote" : "approve_total"
    });
  }

  if (orderStatus === "awaiting_shipping_quote") {
    return presentation({
      responsibility: "debroder",
      tone: "processing",
      title: "Ongkir sedang ditetapkan",
      description: "Admin sedang memilih kurir, layanan, biaya, dan estimasi pengiriman.",
      nextStep: "Anda akan diminta memeriksa dan menyetujui total akhir.",
      previousStage: "Pesanan diterima",
      currentStage: "Penetapan ongkir",
      nextStage: "Persetujuan total",
      action: "track_only"
    });
  }

  if (orderStatus === "under_review") {
    return presentation({
      responsibility: "debroder",
      tone: "processing",
      title: input.isCustom ? "Pesanan custom sedang diperiksa" : "Pesanan sedang diperiksa",
      description: input.isCustom
        ? "Admin sedang memeriksa produk, layanan, file, desain, waktu pengerjaan, dan harga."
        : "Admin sedang memeriksa data pesanan dan ketersediaan barang.",
      nextStep: input.isCustom ? "Berikutnya adalah penetapan harga." : "Berikutnya adalah instruksi pembayaran.",
      previousStage: "Pesanan diterima",
      currentStage: "Pemeriksaan pesanan",
      nextStage: input.isCustom ? "Penetapan harga" : "Pembayaran",
      action: "track_only"
    });
  }

  if (orderStatus === "awaiting_payment" && !isPayAtStore) {
    return presentation({
      responsibility: "customer",
      tone: "action",
      title: input.hasPaymentUrl ? "Selesaikan pembayaran" : "Instruksi pembayaran sedang disiapkan",
      description: input.hasPaymentUrl
        ? "Buka instruksi pembayaran, transfer sesuai total tagihan, lalu unggah bukti."
        : "Pesanan tetap tersimpan. Hubungi Admin bila instruksi belum tersedia.",
      nextStep: `Setelah bukti dikirim, Admin akan memeriksa mutasi sebelum pesanan masuk ke ${postPaymentStage}.`,
      previousStage: input.isCustom ? "Penawaran disetujui" : "Pesanan dikonfirmasi",
      currentStage: "Pembayaran",
      nextStage: "Pemeriksaan pembayaran",
      action: input.hasPaymentUrl ? "pay" : "contact_admin"
    });
  }

  if (PAYMENT_PAID_STATUSES.has(paymentStatus) && ["awaiting_payment", "confirmed", "sudah_dibayar"].includes(orderStatus)) {
    return presentation({
      responsibility: "debroder",
      tone: "processing",
      title: "Pembayaran terverifikasi",
      description: "Dana sudah dikonfirmasi. Tim DEBRODER sedang menyiapkan proses berikutnya.",
      nextStep: `Pesanan akan masuk ke ${postPaymentStage}.`,
      previousStage: "Pemeriksaan pembayaran",
      currentStage: "Pembayaran terverifikasi",
      nextStage: postPaymentStage,
      action: "track_only"
    });
  }

  if (["ready_for_pickup", "siap_diambil"].includes(activeStatus)) {
    return presentation({
      responsibility: "customer",
      tone: "action",
      title: "Barang siap diambil",
      description: "Hubungi Admin sebelum berangkat dan tunjukkan nomor pesanan saat tiba di toko.",
      nextStep: "Setelah barang diserahkan, pesanan akan ditandai selesai.",
      previousStage: "Pengecekan akhir",
      currentStage: "Siap diambil",
      nextStage: "Serah terima",
      action: "pickup"
    });
  }

  if (["ready_to_ship", "siap_dikirim"].includes(activeStatus)) {
    return presentation({
      responsibility: "debroder",
      tone: "processing",
      title: "Pesanan siap dikirim",
      description: "Paket telah melalui pengecekan akhir dan menunggu diserahkan kepada kurir.",
      nextStep: "Nomor resi akan tampil setelah paket diserahkan kepada kurir.",
      previousStage: "Pengecekan akhir",
      currentStage: "Siap dikirim",
      nextStage: "Pengiriman",
      action: "track_only"
    });
  }

  if (["shipped", "in_transit"].includes(activeStatus)) {
    return presentation({
      responsibility: "none",
      tone: "processing",
      title: "Pesanan sedang dikirim",
      description: "Paket sudah diserahkan kepada kurir dan sedang menuju alamat penerima.",
      nextStep: "Pantau nomor resi sampai paket diterima.",
      previousStage: "Paket diserahkan ke kurir",
      currentStage: "Pengiriman",
      nextStage: "Pesanan diterima",
      action: "track_only"
    });
  }

  if (["quality_control", "quality_check"].includes(activeStatus)) {
    return presentation({
      responsibility: "debroder",
      tone: "processing",
      title: "Pemeriksaan kualitas",
      description: "Tim DEBRODER sedang memastikan hasil sesuai spesifikasi pesanan.",
      nextStep: "Pesanan akan dikemas setelah lulus pemeriksaan kualitas.",
      previousStage: input.isCustom ? "Produksi" : "Persiapan barang",
      currentStage: "Pemeriksaan kualitas",
      nextStage: "Pengemasan",
      action: "track_only"
    });
  }

  if (["in_production", "production", "proses_produksi", "ready_for_production", "masuk_produksi"].includes(activeStatus)) {
    return presentation({
      responsibility: "debroder",
      tone: "processing",
      title: "Pesanan sedang diproduksi",
      description: "Tim produksi sedang mengerjakan pesanan berdasarkan spesifikasi yang telah disetujui.",
      nextStep: "Hasil produksi akan masuk ke pemeriksaan kualitas.",
      previousStage: "Surat Perintah Kerja",
      currentStage: "Produksi",
      nextStage: "Pemeriksaan kualitas",
      action: "track_only"
    });
  }

  if (activeStatus === "packing") {
    return presentation({
      responsibility: "debroder",
      tone: "processing",
      title: "Pesanan sedang dikemas",
      description: "Produk dan isi paket sedang diperiksa sebelum pengemasan diselesaikan.",
      nextStep: isPickup ? "Berikutnya barang akan ditandai siap diambil." : "Berikutnya paket akan ditandai siap dikirim.",
      previousStage: "Pemeriksaan",
      currentStage: "Pengemasan",
      nextStage: isPickup ? "Siap diambil" : "Siap dikirim",
      action: "track_only"
    });
  }

  if (["processing", "in_progress", "preparing", "confirmed", "sudah_dibayar"].includes(activeStatus)) {
    return presentation({
      responsibility: "debroder",
      tone: "processing",
      title: input.isCustom ? "Pesanan sedang diproses" : "Barang sedang disiapkan",
      description: input.isCustom
        ? "Tim DEBRODER sedang melanjutkan pesanan ke proses produksi dan pemeriksaan."
        : "Tim DEBRODER sedang memastikan produk, warna, ukuran, jumlah, dan kondisi barang.",
      nextStep: input.isCustom
        ? "Status berikutnya akan mengikuti proses produksi."
        : isPickup
          ? "Barang akan ditandai siap diambil setelah pemeriksaan selesai."
          : "Barang akan diperiksa dan dikemas sebelum dikirim.",
      previousStage: "Pembayaran terverifikasi",
      currentStage: input.isCustom ? "Proses pesanan" : "Persiapan barang",
      nextStage: input.isCustom ? "Produksi" : isPickup ? "Siap diambil" : "Pemeriksaan barang",
      action: "track_only"
    });
  }

  if (isPayAtStore && isPickup) {
    return presentation({
      responsibility: "debroder",
      tone: "processing",
      title: "Barang sedang disiapkan untuk diambil",
      description: "Anda belum perlu melakukan transfer. Tunggu konfirmasi barang siap sebelum datang ke toko.",
      nextStep: "Pembayaran dilakukan di toko saat barang sudah siap diserahkan.",
      previousStage: "Pesanan diterima",
      currentStage: "Persiapan barang",
      nextStage: "Siap diambil",
      action: "track_only"
    });
  }

  return presentation({
    responsibility: "debroder",
    tone: "processing",
    title: "Status pesanan sedang diperbarui",
    description: "Pesanan tetap tersimpan. Tim DEBRODER sedang memperbarui tahap operasionalnya.",
    nextStep: "Periksa kembali halaman pelacakan untuk pembaruan terbaru.",
    previousStage: "Pesanan diterima",
    currentStage: "Pembaruan status",
    nextStage: "Tahap berikutnya",
    action: "track_only"
  });
}
