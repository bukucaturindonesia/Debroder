export type UiAudience = "admin" | "customer";

const ADMIN_ORDER_STATUS_LABELS = {
  baru: "Pesanan Masuk",
  pending_confirmation: "Menunggu Verifikasi Pelanggan",
  under_review: "Sedang Diperiksa",
  awaiting_shipping_quote: "Menunggu Penetapan Ongkir",
  awaiting_customer_approval: "Menunggu Persetujuan Pelanggan",
  awaiting_payment: "Menunggu Pembayaran",
  menunggu_pembayaran: "Menunggu Pembayaran",
  confirmed: "Pesanan Dikonfirmasi",
  sudah_dibayar: "Pembayaran Diterima",
  processing: "Sedang Diproses",
  in_progress: "Sedang Diproses",
  ready_for_production: "Siap Diproduksi",
  masuk_produksi: "Siap Diproduksi",
  in_production: "Sedang Diproduksi",
  production: "Sedang Diproduksi",
  proses_produksi: "Sedang Diproduksi",
  quality_control: "Pemeriksaan Kualitas",
  quality_check: "Pemeriksaan Kualitas",
  packing: "Sedang Dikemas",
  ready_for_pickup: "Siap Diambil",
  siap_diambil: "Siap Diambil",
  ready_to_ship: "Siap Dikirim",
  siap_dikirim: "Siap Dikirim",
  in_transit: "Dalam Pengiriman",
  shipped: "Sudah Dikirim",
  delivered: "Sudah Diterima",
  picked_up: "Sudah Diambil",
  completed: "Selesai",
  selesai: "Selesai",
  expired: "Kedaluwarsa",
  cancelled: "Dibatalkan",
  dibatalkan: "Dibatalkan"
} as const;

const CUSTOMER_ORDER_STATUS_LABELS = {
  baru: "Pesanan diterima",
  pending_confirmation: "Menunggu verifikasi WhatsApp",
  under_review: "Pesanan sedang kami periksa",
  awaiting_shipping_quote: "Ongkir sedang kami periksa",
  awaiting_customer_approval: "Menunggu persetujuan Anda",
  awaiting_payment: "Menunggu pembayaran",
  menunggu_pembayaran: "Menunggu pembayaran",
  confirmed: "Pesanan telah dikonfirmasi",
  sudah_dibayar: "Pembayaran telah diterima",
  processing: "Pesanan sedang diproses",
  in_progress: "Pesanan sedang diproses",
  ready_for_production: "Pesanan siap diproduksi",
  masuk_produksi: "Pesanan siap diproduksi",
  in_production: "Pesanan sedang diproduksi",
  production: "Pesanan sedang diproduksi",
  proses_produksi: "Pesanan sedang diproduksi",
  quality_control: "Pesanan sedang diperiksa",
  quality_check: "Pesanan sedang diperiksa",
  packing: "Pesanan sedang dikemas",
  ready_for_pickup: "Pesanan siap diambil",
  siap_diambil: "Pesanan siap diambil",
  ready_to_ship: "Pesanan siap dikirim",
  siap_dikirim: "Pesanan siap dikirim",
  in_transit: "Pesanan sedang dikirim",
  shipped: "Pesanan sudah dikirim",
  delivered: "Pesanan sudah diterima",
  picked_up: "Pesanan sudah diambil",
  completed: "Pesanan selesai",
  selesai: "Pesanan selesai",
  expired: "Masa pesanan telah berakhir",
  cancelled: "Pesanan dibatalkan",
  dibatalkan: "Pesanan dibatalkan"
} as const;

const ADMIN_PAYMENT_STATUS_LABELS = {
  draft: "Draft Pembayaran",
  pending: "Menunggu Verifikasi",
  unpaid: "Belum Dibayar",
  belum_bayar: "Belum Dibayar",
  pending_verification: "Menunggu Verifikasi",
  menunggu_verifikasi: "Menunggu Verifikasi",
  partially_paid: "Dibayar Sebagian",
  verified: "Terverifikasi",
  paid: "Lunas",
  terverifikasi: "Lunas",
  rejected: "Ditolak",
  ditolak: "Ditolak",
  expired: "Kedaluwarsa",
  refunded: "Dana Dikembalikan",
  voided: "Dibatalkan"
} as const;

const CUSTOMER_PAYMENT_STATUS_LABELS = {
  draft: "Pembayaran belum dikirim",
  pending: "Pembayaran sedang diperiksa",
  unpaid: "Belum dibayar",
  belum_bayar: "Belum dibayar",
  pending_verification: "Pembayaran sedang diperiksa",
  menunggu_verifikasi: "Pembayaran sedang diperiksa",
  partially_paid: "Dibayar sebagian",
  verified: "Pembayaran terverifikasi",
  paid: "Lunas",
  terverifikasi: "Lunas",
  rejected: "Bukti pembayaran ditolak",
  ditolak: "Bukti pembayaran ditolak",
  expired: "Tautan pembayaran kedaluwarsa",
  refunded: "Dana telah dikembalikan",
  voided: "Pembayaran dibatalkan"
} as const;

const PRICING_STATUS_LABELS = {
  draft: "Draft Harga",
  estimated: "Estimasi Harga",
  quotation_required: "Menunggu Penawaran Harga",
  pricing: "Penetapan Harga",
  pending: "Menunggu Penetapan Harga",
  final: "Harga Final",
  locked: "Harga Disetujui"
} as const;

const CMS_STATUS_LABELS = {
  draft: "Draft",
  scheduled: "Dijadwalkan",
  published: "Diterbitkan",
  archived: "Diarsipkan",
  active: "Aktif",
  inactive: "Tidak Aktif"
} as const;

function normalized(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function mappedLabel(
  value: unknown,
  labels: Readonly<Record<string, string>>,
  fallback: string
) {
  const key = normalized(value);
  return (key && labels[key]) || fallback;
}

export function getOrderStatusLabel(value: unknown, audience: UiAudience = "admin") {
  return mappedLabel(
    value,
    audience === "customer" ? CUSTOMER_ORDER_STATUS_LABELS : ADMIN_ORDER_STATUS_LABELS,
    audience === "customer"
      ? "Status pesanan sedang diperbarui"
      : "Status pesanan belum dikenali"
  );
}

export function getPaymentStatusLabel(value: unknown, audience: UiAudience = "admin") {
  return mappedLabel(
    value,
    audience === "customer" ? CUSTOMER_PAYMENT_STATUS_LABELS : ADMIN_PAYMENT_STATUS_LABELS,
    audience === "customer"
      ? "Status pembayaran sedang diperbarui"
      : "Status pembayaran belum dikenali"
  );
}

export function getPricingStatusLabel(value: unknown) {
  return mappedLabel(value, PRICING_STATUS_LABELS, "Status harga belum dikenali");
}

export function getCmsStatusLabel(value: unknown) {
  return mappedLabel(value, CMS_STATUS_LABELS, "Status belum dikenali");
}

export function getActiveStatusLabel(value: unknown) {
  return normalized(value) === "active" ? "Aktif" : normalized(value) === "inactive" ? "Tidak Aktif" : "Status belum dikenali";
}

export function getFulfillmentMethodLabel(value: unknown) {
  return mappedLabel(
    value,
    { pickup: "Ambil di Toko", shipping: "Kurir Eksternal" },
    "Metode pengiriman belum dikenali"
  );
}

export const uiLanguageMaps = {
  adminOrderStatus: ADMIN_ORDER_STATUS_LABELS,
  customerOrderStatus: CUSTOMER_ORDER_STATUS_LABELS,
  adminPaymentStatus: ADMIN_PAYMENT_STATUS_LABELS,
  customerPaymentStatus: CUSTOMER_PAYMENT_STATUS_LABELS,
  pricingStatus: PRICING_STATUS_LABELS,
  cmsStatus: CMS_STATUS_LABELS
} as const;
