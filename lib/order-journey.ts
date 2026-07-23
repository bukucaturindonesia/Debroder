import type { OrderActiveStageResolution } from "@/lib/order-active-stage";

export type OrderJourneyState = "done" | "current" | "upcoming" | "stopped" | "skipped";

export type OrderJourneyStep = {
  id: string;
  label: string;
  description: string;
  state: OrderJourneyState;
  position: number;
};

type JourneyInput = {
  stage: OrderActiveStageResolution;
  fulfillmentMethod?: string | null;
};

type JourneyDefinition = Omit<OrderJourneyStep, "state" | "position">;

const READY_STOCK_BASE: JourneyDefinition[] = [
  { id: "order_created", label: "Pesanan Dibuat", description: "Pesanan berhasil dicatat dan nomor pesanan sudah tersedia." },
  { id: "order_review", label: "Pemeriksaan Pesanan", description: "Data pelanggan, produk, jumlah, stok, dan metode penyerahan diperiksa." },
  { id: "payment", label: "Pembayaran", description: "Instruksi pembayaran, bukti, dan dana masuk diproses pada pesanan yang sama." },
  { id: "preparing_goods", label: "Persiapan Barang", description: "Warna, ukuran, jumlah, dan kondisi barang disiapkan." },
  { id: "quality_control", label: "Pemeriksaan Barang", description: "Barang dicocokkan dengan rincian pesanan sebelum dikemas." },
  { id: "packing", label: "Pengemasan", description: "Barang dikemas dengan aman sesuai metode penyerahan." },
  { id: "final_check", label: "Pengecekan Akhir", description: "Isi paket, penerima, jumlah paket, dan kondisi kemasan diperiksa kembali." },
  { id: "handover", label: "Pengiriman / Ambil di Toko", description: "Paket diserahkan kepada kurir atau kepada pelanggan di toko." },
  { id: "completed", label: "Selesai", description: "Pesanan diterima atau sudah diambil oleh pelanggan." }
];

const CUSTOM_BASE: JourneyDefinition[] = [
  { id: "order_created", label: "Pesanan Dibuat", description: "Konfigurasi custom dan nomor pesanan berhasil disimpan." },
  { id: "order_review", label: "Pemeriksaan Pesanan", description: "Produk, layanan, file, desain, jumlah, dan kebutuhan pengerjaan diperiksa." },
  { id: "custom_pricing", label: "Penawaran Harga", description: "Harga dan ruang lingkup custom disusun dalam versi yang dapat diaudit." },
  { id: "customer_approval", label: "Persetujuan Pelanggan", description: "Pelanggan memeriksa dan menyetujui penawaran final." },
  { id: "payment", label: "Pembayaran", description: "Bukti dan dana masuk diverifikasi tanpa membuat pesanan baru." },
  { id: "job_order", label: "Surat Perintah Kerja", description: "Instruksi produksi resmi diterbitkan dari pesanan yang telah memenuhi syarat." },
  { id: "production", label: "Produksi", description: "Tim produksi mengerjakan pesanan sesuai spesifikasi yang disetujui." },
  { id: "quality_control", label: "Pemeriksaan Kualitas", description: "Hasil produksi diperiksa dan dicatat sebelum pengemasan." },
  { id: "packing", label: "Pengemasan", description: "Hasil yang lulus pemeriksaan dikemas untuk penyerahan." },
  { id: "final_check", label: "Pengecekan Akhir", description: "Produk, desain aktif, jumlah, penerima, dan kondisi paket dicocokkan kembali." },
  { id: "handover", label: "Pengiriman / Ambil di Toko", description: "Paket diserahkan kepada kurir atau pelanggan." },
  { id: "completed", label: "Selesai", description: "Pesanan telah diterima atau diambil." }
];

const COMPACT_BASE: JourneyDefinition[] = [
  { id: "order", label: "Pesanan Masuk", description: "Pesanan tercatat dan identitas order tersedia." },
  { id: "verification", label: "Verifikasi & Harga", description: "Data, stok, harga, ongkir, atau penawaran diperiksa." },
  { id: "payment", label: "Pembayaran", description: "Instruksi, bukti, dan dana masuk diverifikasi." },
  { id: "operations", label: "Persiapan / Produksi", description: "Barang disiapkan atau pesanan custom diproduksi dan diperiksa." },
  { id: "handover", label: "Pengiriman / Pickup", description: "Paket diserahkan kepada kurir atau pelanggan." },
  { id: "completed", label: "Selesai", description: "Pesanan benar-benar diterima atau diambil pelanggan." }
];

const STAGE_TO_JOURNEY: Record<string, string> = {
  whatsapp_confirmation: "order_created",
  order_review: "order_review",
  integrity_review: "order_review",
  shipping_quote: "order_review",
  custom_pricing: "custom_pricing",
  customer_approval: "customer_approval",
  payment_pending: "payment",
  payment_review: "payment",
  payment_correction: "payment",
  payment_balance_due: "payment",
  job_order_required: "job_order",
  preparing_goods: "preparing_goods",
  production: "production",
  quality_control: "quality_control",
  packing: "packing",
  final_check: "final_check",
  final_check_completed: "final_check",
  ready_to_ship: "handover",
  shipping: "handover",
  ready_for_pickup: "handover",
  completed: "completed",
  cancelled: "order_created",
  expired: "order_created"
};

const STAGE_TO_COMPACT: Record<string, string> = {
  whatsapp_confirmation: "order",
  order_review: "verification",
  integrity_review: "verification",
  shipping_quote: "verification",
  custom_pricing: "verification",
  customer_approval: "verification",
  payment_pending: "payment",
  payment_review: "payment",
  payment_correction: "payment",
  payment_balance_due: "payment",
  job_order_required: "operations",
  preparing_goods: "operations",
  production: "operations",
  quality_control: "operations",
  packing: "operations",
  final_check: "operations",
  final_check_completed: "operations",
  ready_to_ship: "handover",
  shipping: "handover",
  ready_for_pickup: "handover",
  completed: "completed",
  cancelled: "order",
  expired: "order"
};

export function buildOrderJourney({ stage, fulfillmentMethod }: JourneyInput): OrderJourneyStep[] {
  const definitions = stage.lifecycleKind === "custom" ? CUSTOM_BASE : READY_STOCK_BASE;
  const activeId = STAGE_TO_JOURNEY[stage.activeStage] ?? "order_review";
  const activeIndex = Math.max(0, definitions.findIndex((item) => item.id === activeId));
  const stopped = stage.activeStage === "cancelled" || stage.activeStage === "expired";

  if (stopped) {
    const terminalLabel = stage.activeStage === "expired" ? "Pesanan Kedaluwarsa" : "Pesanan Dibatalkan";
    const terminalDescription = stage.activeStage === "expired"
      ? "Masa berlaku pesanan berakhir sebelum proses dapat dilanjutkan."
      : "Pesanan dihentikan dan tahap operasional setelahnya tidak dilanjutkan.";
    const remaining = definitions.slice(1).map((definition, index) => ({
      ...definition,
      label: definition.id === "handover"
        ? normalized(fulfillmentMethod) === "pickup" ? "Ambil di Toko" : "Pengiriman"
        : definition.label,
      description: definition.description,
      state: "skipped" as const,
      position: index + 3
    }));
    return [
      { ...definitions[0], state: "done" as const, position: 1 },
      { id: stage.activeStage, label: terminalLabel, description: terminalDescription, state: "stopped" as const, position: 2 },
      ...remaining
    ];
  }

  return definitions.map((definition, index) => ({
    ...definition,
    label: definition.id === "handover"
      ? normalized(fulfillmentMethod) === "pickup" ? "Ambil di Toko" : "Pengiriman"
      : definition.label,
    description: definition.id === "handover"
      ? normalized(fulfillmentMethod) === "pickup"
        ? "Barang disiapkan di lokasi pickup lalu diserahkan kepada pelanggan."
        : "Paket diberi resi resmi kurir lalu diserahkan untuk pengiriman."
      : definition.description,
    state: index < activeIndex ? "done" : index === activeIndex ? "current" : "upcoming",
    position: index + 1
  }));
}

export function buildCompactOrderJourney({ stage, fulfillmentMethod }: JourneyInput): OrderJourneyStep[] {
  const stopped = stage.activeStage === "cancelled" || stage.activeStage === "expired";
  const handoverLabel = normalized(fulfillmentMethod) === "pickup" ? "Pickup" : "Pengiriman";
  const definitions = COMPACT_BASE.map((definition) => definition.id === "handover"
    ? { ...definition, label: handoverLabel }
    : definition);

  if (stopped) {
    const terminalLabel = stage.activeStage === "expired" ? "Kedaluwarsa" : "Dibatalkan";
    return definitions.map((definition, index) => index === 0
      ? {
          ...definition,
          id: stage.activeStage,
          label: terminalLabel,
          description: stage.blockingReason || "Pesanan tidak dilanjutkan.",
          state: "stopped" as const,
          position: 1
        }
      : { ...definition, state: "skipped" as const, position: index + 1 });
  }

  const activeId = STAGE_TO_COMPACT[stage.activeStage] ?? "verification";
  const activeIndex = Math.max(0, definitions.findIndex((definition) => definition.id === activeId));
  return definitions.map((definition, index) => ({
    ...definition,
    state: index < activeIndex ? "done" : index === activeIndex ? "current" : "upcoming",
    position: index + 1
  }));
}

export function orderJourneyCurrentStep(steps: OrderJourneyStep[]) {
  return steps.find((step) => step.state === "current" || step.state === "stopped") ?? steps[0];
}

function normalized(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}
