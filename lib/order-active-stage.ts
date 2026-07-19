export type OrderLifecycleKind = "ready_stock" | "custom";
export type OrderResponsibility = "customer" | "debroder" | "none";
export type OrderStageTone = "action" | "processing" | "success" | "warning";

export type OrderPrimaryAction =
  | "verify_whatsapp"
  | "review_order"
  | "set_shipping_quote"
  | "prepare_quote"
  | "approve_quote"
  | "approve_total"
  | "open_payment"
  | "review_payment"
  | "resubmit_payment"
  | "create_job_order"
  | "prepare_goods"
  | "run_production"
  | "run_quality_control"
  | "pack_order"
  | "run_final_check"
  | "dispatch_order"
  | "handover_pickup"
  | "contact_admin"
  | "track_only"
  | null;

export type OrderAdminTaskType =
  | "review_new_order"
  | "review_custom_order"
  | "set_shipping_quote"
  | "prepare_custom_quote"
  | "review_payment"
  | "resolve_payment_correction"
  | "create_job_order"
  | "prepare_ready_stock"
  | "run_production"
  | "run_quality_control"
  | "pack_order"
  | "run_final_check"
  | "dispatch_shipping"
  | "handover_pickup"
  | "resolve_integrity"
  | null;

export type OrderActiveStageInput = {
  orderId?: string | null;
  orderNumber?: string | null;
  status?: string | null;
  paymentStatus?: string | null;
  latestPaymentStatus?: string | null;
  latestPaymentReviewOutcome?: string | null;
  fulfillmentStatus?: string | null;
  fulfillmentMethod?: string | null;
  paymentMethod?: string | null;
  pricingStatus?: string | null;
  customQuoteStatus?: string | null;
  customQuoteVersion?: number | null;
  isCustom?: boolean;
  whatsappConfirmed?: boolean;
  paymentRequirementMet?: boolean;
  paymentProductionEligible?: boolean;
  paymentEffectiveTotal?: number | null;
  hasVerifiedPayment?: boolean;
  hasPaymentUrl?: boolean;
  hasJobOrder?: boolean;
  jobOrderStatus?: string | null;
  qualityControlStatus?: string | null;
  finalVerificationCompleted?: boolean;
  trackingNumber?: string | null;
  taskRevision?: string | number | null;
};

export type OrderActiveStageResolution = {
  activeStage: string;
  lifecycleKind: OrderLifecycleKind;
  responsibility: OrderResponsibility;
  responsibilityLabel: string;
  tone: OrderStageTone;
  customerStatusLabel: string;
  adminStatusLabel: string;
  customerTitle: string;
  customerDescription: string;
  adminTaskType: OrderAdminTaskType;
  primaryAction: OrderPrimaryAction;
  secondaryAction: "track" | "contact_admin" | null;
  previousStage: string;
  nextStage: string;
  nextStep: string;
  blockingReason: string | null;
  warning: string | null;
  warnings: string[];
  taskKey: string | null;
  isTerminal: boolean;
};

const TERMINAL_SUCCESS = new Set(["completed", "selesai", "delivered", "picked_up"]);
const TERMINAL_CANCELLED = new Set(["cancelled", "dibatalkan", "expired"]);
const PAYMENT_PENDING = new Set(["pending", "pending_verification", "menunggu_verifikasi"]);
const PAYMENT_VERIFIED = new Set(["paid", "verified", "terverifikasi"]);
const PAYMENT_CORRECTION = new Set([
  "rejected",
  "ditolak",
  "funds_not_found",
  "correction_required",
  "needs_correction",
  "proof_unclear"
]);
const FULFILLMENT_COMPLETE = new Set(["delivered", "picked_up", "completed", "selesai"]);

function normalized(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function responsibilityLabel(value: OrderResponsibility) {
  if (value === "customer") return "TINDAKAN ANDA";
  if (value === "debroder") return "SEDANG DIPROSES DEBRODER";
  return "TIDAK ADA TINDAKAN YANG DIPERLUKAN";
}

function taskKey(input: OrderActiveStageInput, type: OrderAdminTaskType) {
  const id = normalized(input.orderId) || normalized(input.orderNumber);
  if (!id || !type) return null;
  const revision = input.taskRevision == null || input.taskRevision === ""
    ? "current"
    : String(input.taskRevision).trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-");
  return `order:${id}:${type}:${revision}`;
}

function finish(
  input: OrderActiveStageInput,
  values: Omit<OrderActiveStageResolution, "lifecycleKind" | "responsibilityLabel" | "taskKey" | "warnings">
    & { warnings?: string[] }
): OrderActiveStageResolution {
  const lifecycleKind: OrderLifecycleKind = input.isCustom ? "custom" : "ready_stock";
  const warnings = values.warnings ?? [];
  return {
    ...values,
    lifecycleKind,
    responsibilityLabel: responsibilityLabel(values.responsibility),
    warning: values.warning ?? warnings[0] ?? null,
    warnings,
    taskKey: taskKey(input, values.adminTaskType)
  };
}

function integrityWarnings(input: OrderActiveStageInput) {
  const orderStatus = normalized(input.status);
  const paymentStatus = normalized(input.latestPaymentStatus) || normalized(input.paymentStatus);
  const fulfillmentStatus = normalized(input.fulfillmentStatus);
  const warnings: string[] = [];

  if (TERMINAL_CANCELLED.has(orderStatus) && PAYMENT_PENDING.has(paymentStatus)) {
    warnings.push("Pesanan terminal masih memiliki pembayaran yang menunggu pemeriksaan.");
  }
  if (!TERMINAL_CANCELLED.has(orderStatus)
    && PAYMENT_PENDING.has(paymentStatus)
    && !["awaiting_payment", "processing"].includes(orderStatus)) {
    warnings.push("Pemeriksaan pembayaran aktif tetapi status order belum berada pada tahap pembayaran.");
  }
  if (TERMINAL_SUCCESS.has(orderStatus) && fulfillmentStatus && !FULFILLMENT_COMPLETE.has(fulfillmentStatus)) {
    warnings.push("Pesanan selesai tetapi fulfillment belum terminal.");
  }
  if (input.paymentRequirementMet
    && normalized(input.paymentMethod) !== "pay_at_store"
    && (input.paymentEffectiveTotal != null || input.hasVerifiedPayment != null)
    && Number(input.paymentEffectiveTotal ?? 0) <= 0
    && input.hasVerifiedPayment !== true) {
    warnings.push("Syarat pembayaran terpenuhi tanpa pembayaran terverifikasi.");
  }
  if (input.paymentProductionEligible && !input.paymentRequirementMet && normalized(input.paymentMethod) !== "pay_at_store") {
    warnings.push("Pesanan ditandai dapat diproses sebelum syarat pembayaran terpenuhi.");
  }
  if (input.isCustom && input.hasJobOrder && !input.paymentProductionEligible) {
    warnings.push("Pesanan custom memiliki Surat Perintah Kerja sebelum memenuhi prasyarat produksi.");
  }
  if (["ready_for_pickup", "picked_up"].includes(fulfillmentStatus) && normalized(input.fulfillmentMethod) !== "pickup") {
    warnings.push("Status siap diambil tidak cocok dengan metode fulfillment.");
  }
  if (["ready_to_ship", "shipped", "in_transit", "delivered"].includes(fulfillmentStatus)
    && normalized(input.fulfillmentMethod) !== "shipping") {
    warnings.push("Status pengiriman tidak cocok dengan metode fulfillment.");
  }
  return warnings;
}


export function resolveOrderActiveStageFromServer(
  input: OrderActiveStageInput,
  serverValue: unknown
): OrderActiveStageResolution {
  const fallback = resolveOrderActiveStage(input);
  if (!serverValue || typeof serverValue !== "object" || Array.isArray(serverValue)) return fallback;
  const record = serverValue as Record<string, unknown>;
  const text = (key: string, defaultValue: string) =>
    typeof record[key] === "string" && record[key] ? record[key] as string : defaultValue;
  const nullableText = (key: string, defaultValue: string | null) =>
    record[key] === null ? null : typeof record[key] === "string" ? record[key] as string : defaultValue;
  const responsibility = new Set(["customer", "debroder", "none"]).has(record.responsibility as string)
    ? record.responsibility as OrderResponsibility
    : fallback.responsibility;
  const tone = new Set(["action", "processing", "success", "warning"]).has(record.tone as string)
    ? record.tone as OrderStageTone
    : fallback.tone;
  const lifecycleKind = new Set(["ready_stock", "custom"]).has(record.lifecycleKind as string)
    ? record.lifecycleKind as OrderLifecycleKind
    : fallback.lifecycleKind;
  const warnings = Array.isArray(record.warnings)
    ? record.warnings.filter((value): value is string => typeof value === "string" && Boolean(value.trim()))
    : fallback.warnings;

  return {
    activeStage: text("activeStage", fallback.activeStage),
    lifecycleKind,
    responsibility,
    responsibilityLabel: text("responsibilityLabel", responsibilityLabel(responsibility)),
    tone,
    customerStatusLabel: text("customerStatusLabel", fallback.customerStatusLabel),
    adminStatusLabel: text("adminStatusLabel", fallback.adminStatusLabel),
    customerTitle: text("customerTitle", fallback.customerTitle),
    customerDescription: text("customerDescription", fallback.customerDescription),
    adminTaskType: nullableText("adminTaskType", fallback.adminTaskType) as OrderAdminTaskType,
    primaryAction: nullableText("primaryAction", fallback.primaryAction) as OrderPrimaryAction,
    secondaryAction: nullableText("secondaryAction", fallback.secondaryAction) as "track" | "contact_admin" | null,
    previousStage: text("previousStage", fallback.previousStage),
    nextStage: text("nextStage", fallback.nextStage),
    nextStep: text("nextStep", fallback.nextStep),
    blockingReason: nullableText("blockingReason", fallback.blockingReason),
    warning: nullableText("warning", fallback.warning),
    warnings,
    taskKey: nullableText("taskKey", fallback.taskKey),
    isTerminal: typeof record.isTerminal === "boolean" ? record.isTerminal : fallback.isTerminal
  };
}

function blockingIntegrityWarning(input: OrderActiveStageInput) {
  const fulfillmentStatus = normalized(input.fulfillmentStatus);
  const fulfillmentMethod = normalized(input.fulfillmentMethod);
  const paymentMethod = normalized(input.paymentMethod);
  if (input.paymentRequirementMet
    && paymentMethod !== "pay_at_store"
    && (input.paymentEffectiveTotal != null || input.hasVerifiedPayment != null)
    && Number(input.paymentEffectiveTotal ?? 0) <= 0
    && input.hasVerifiedPayment !== true) {
    return "Syarat pembayaran terpenuhi tanpa pembayaran terverifikasi.";
  }
  if (input.paymentProductionEligible && !input.paymentRequirementMet && paymentMethod !== "pay_at_store") {
    return "Pesanan ditandai dapat diproses sebelum syarat pembayaran terpenuhi.";
  }
  if (input.isCustom && input.hasJobOrder && !input.paymentProductionEligible) {
    return "Pesanan custom memiliki Surat Perintah Kerja sebelum memenuhi prasyarat produksi.";
  }
  if (["ready_for_pickup", "picked_up"].includes(fulfillmentStatus) && fulfillmentMethod !== "pickup") {
    return "Status siap diambil tidak cocok dengan metode fulfillment.";
  }
  if (["ready_to_ship", "shipped", "in_transit", "delivered"].includes(fulfillmentStatus)
    && fulfillmentMethod !== "shipping") {
    return "Status pengiriman tidak cocok dengan metode fulfillment.";
  }
  return null;
}

export function resolveOrderActiveStage(input: OrderActiveStageInput): OrderActiveStageResolution {
  const orderStatus = normalized(input.status);
  const paymentStatus = normalized(input.latestPaymentStatus) || normalized(input.paymentStatus);
  const reviewOutcome = normalized(input.latestPaymentReviewOutcome);
  const fulfillmentStatus = normalized(input.fulfillmentStatus);
  const jobStatus = normalized(input.jobOrderStatus);
  const qcStatus = normalized(input.qualityControlStatus);
  const isPickup = normalized(input.fulfillmentMethod) === "pickup";
  const isShipping = normalized(input.fulfillmentMethod) === "shipping";
  const isPayAtStore = normalized(input.paymentMethod) === "pay_at_store";
  const postPaymentStage = input.isCustom ? "Surat Perintah Kerja" : "Persiapan Barang";
  const warnings = integrityWarnings(input);

  // Terminal state always wins. Contradictory child records become integrity warnings,
  // never a reason to reopen a completed/cancelled customer journey silently.
  if (TERMINAL_SUCCESS.has(orderStatus) || FULFILLMENT_COMPLETE.has(fulfillmentStatus)) {
    return finish(input, {
      activeStage: "completed",
      responsibility: "none",
      tone: "success",
      customerStatusLabel: "Selesai",
      adminStatusLabel: "Pesanan Selesai",
      customerTitle: "Pesanan selesai",
      customerDescription: isPickup
        ? "Barang telah diserahkan. Simpan nomor pesanan untuk kebutuhan layanan setelah pembelian."
        : "Pesanan telah diterima. Simpan nomor pesanan untuk kebutuhan layanan setelah pembelian.",
      adminTaskType: warnings.length ? "resolve_integrity" : null,
      primaryAction: warnings.length ? "review_order" : "track_only",
      secondaryAction: "track",
      previousStage: isPickup ? "Serah Terima" : "Pengiriman",
      nextStage: "Layanan Setelah Pembelian",
      nextStep: "Tidak ada tindakan pelanggan yang diperlukan.",
      blockingReason: null,
      warning: warnings[0] ?? null,
      isTerminal: true,
      warnings
    });
  }

  if (TERMINAL_CANCELLED.has(orderStatus)) {
    return finish(input, {
      activeStage: orderStatus === "expired" ? "expired" : "cancelled",
      responsibility: "customer",
      tone: "warning",
      customerStatusLabel: orderStatus === "expired" ? "Kedaluwarsa" : "Dibatalkan",
      adminStatusLabel: orderStatus === "expired" ? "Pesanan Kedaluwarsa" : "Pesanan Dibatalkan",
      customerTitle: orderStatus === "expired" ? "Masa pesanan telah berakhir" : "Pesanan tidak aktif",
      customerDescription: "Hubungi Admin DEBRODER bila Anda masih ingin melanjutkan atau membuat pesanan baru.",
      adminTaskType: warnings.length ? "resolve_integrity" : null,
      primaryAction: "contact_admin",
      secondaryAction: "track",
      previousStage: "Pesanan Dibuat",
      nextStage: "Hubungi Admin",
      nextStep: "Admin akan membantu memeriksa pilihan yang masih tersedia.",
      blockingReason: orderStatus === "expired" ? "Masa berlaku pesanan telah berakhir." : "Pesanan telah dibatalkan.",
      warning: warnings[0] ?? null,
      isTerminal: true,
      warnings
    });
  }

  const hardIntegrityWarning = blockingIntegrityWarning(input);
  if (hardIntegrityWarning) {
    return finish(input, {
      activeStage: "integrity_review",
      responsibility: "debroder",
      tone: "warning",
      customerStatusLabel: "Status Sedang Diperbarui",
      adminStatusLabel: "Periksa Integritas Pesanan",
      customerTitle: "Status pesanan sedang diperbarui",
      customerDescription: "Pesanan tetap tersimpan. Tim DEBRODER sedang memeriksa konsistensi tahap operasionalnya.",
      adminTaskType: "resolve_integrity",
      primaryAction: "review_order",
      secondaryAction: "track",
      previousStage: "Pesanan Tercatat",
      nextStage: "Tahap Aman Berikutnya",
      nextStep: "Proses dilanjutkan setelah kondisi pesanan dinyatakan konsisten.",
      blockingReason: hardIntegrityWarning,
      warning: hardIntegrityWarning,
      isTerminal: false,
      warnings
    });
  }

  // Concrete post-payment operational facts outrank stale payment/order summaries.
  const operationalStatus = fulfillmentStatus || orderStatus;
  if (operationalStatus === "ready_for_pickup") {
    return finish(input, {
      activeStage: "ready_for_pickup",
      responsibility: "customer",
      tone: "action",
      customerStatusLabel: "Barang Siap Diambil",
      adminStatusLabel: "Menunggu Serah Terima",
      customerTitle: isPayAtStore ? "Barang siap diambil dan dibayar di toko" : "Barang siap diambil",
      customerDescription: "Hubungi Admin sebelum berangkat dan tunjukkan nomor pesanan saat tiba di toko.",
      adminTaskType: "handover_pickup",
      primaryAction: "handover_pickup",
      secondaryAction: "track",
      previousStage: "Pengecekan Akhir",
      nextStage: "Serah Terima",
      nextStep: isPayAtStore
        ? "Pembayaran dikonfirmasi oleh Admin saat barang diserahkan."
        : "Setelah barang diserahkan, pesanan akan ditandai selesai.",
      blockingReason: null,
      warning: warnings[0] ?? null,
      isTerminal: false,
      warnings
    });
  }

  if (["ready_to_ship", "shipped", "in_transit"].includes(operationalStatus)) {
    const shipped = ["shipped", "in_transit"].includes(operationalStatus);
    return finish(input, {
      activeStage: shipped ? "shipping" : "ready_to_ship",
      responsibility: shipped ? "none" : "debroder",
      tone: "processing",
      customerStatusLabel: shipped ? "Sedang Dikirim" : "Siap Dikirim",
      adminStatusLabel: shipped ? "Pengiriman Berjalan" : "Serahkan ke Kurir",
      customerTitle: shipped ? "Pesanan sedang dikirim" : "Pesanan siap dikirim",
      customerDescription: shipped
        ? "Paket sudah diserahkan kepada kurir dan sedang menuju alamat penerima."
        : "Paket telah melalui pengecekan akhir dan menunggu diserahkan kepada kurir.",
      adminTaskType: shipped ? null : "dispatch_shipping",
      primaryAction: shipped ? "track_only" : "dispatch_order",
      secondaryAction: "track",
      previousStage: "Pengecekan Akhir",
      nextStage: shipped ? "Pesanan Diterima" : "Pengiriman",
      nextStep: input.trackingNumber
        ? "Gunakan nomor resi untuk memantau paket sampai diterima."
        : "Nomor resi akan tampil setelah tersedia.",
      blockingReason: null,
      warning: warnings[0] ?? null,
      isTerminal: false,
      warnings
    });
  }

  if (operationalStatus === "packing") {
    const finalCheckDone = Boolean(input.finalVerificationCompleted);
    return finish(input, {
      activeStage: finalCheckDone ? "final_check_completed" : "final_check",
      responsibility: "debroder",
      tone: "processing",
      customerStatusLabel: finalCheckDone ? "Pengecekan Akhir Selesai" : "Pengecekan Akhir",
      adminStatusLabel: finalCheckDone
        ? (isPickup ? "Tandai Barang Siap Diambil" : "Tandai Pesanan Siap Dikirim")
        : "Lakukan Pengecekan Akhir",
      customerTitle: finalCheckDone ? "Pengecekan akhir selesai" : "Pesanan sedang melalui pengecekan akhir",
      customerDescription: finalCheckDone
        ? "Paket telah diperiksa dan sedang disiapkan untuk tahap penyerahan."
        : "Tim DEBRODER sedang mencocokkan produk, jumlah, penerima, dan kondisi paket sebelum penyerahan.",
      adminTaskType: "run_final_check",
      primaryAction: "run_final_check",
      secondaryAction: "track",
      previousStage: "Pengemasan",
      nextStage: isPickup ? "Siap Diambil" : "Siap Dikirim",
      nextStep: finalCheckDone
        ? `Admin akan mengubah status menjadi ${isPickup ? "siap diambil" : "siap dikirim"}.`
        : "Setelah checklist lengkap, pesanan dapat masuk ke tahap penyerahan.",
      blockingReason: finalCheckDone ? "Status penyerahan belum diperbarui." : "Checklist pengecekan akhir belum selesai.",
      warning: warnings[0] ?? null,
      isTerminal: false,
      warnings
    });
  }

  if (["quality_control", "quality_check"].includes(operationalStatus)) {
    return finish(input, {
      activeStage: "quality_control",
      responsibility: "debroder",
      tone: "processing",
      customerStatusLabel: "Pemeriksaan Kualitas",
      adminStatusLabel: "Lakukan Pemeriksaan Kualitas",
      customerTitle: "Pemeriksaan kualitas",
      customerDescription: "Tim DEBRODER sedang memastikan hasil sesuai spesifikasi pesanan.",
      adminTaskType: "run_quality_control",
      primaryAction: "run_quality_control",
      secondaryAction: "track",
      previousStage: input.isCustom ? "Produksi" : "Persiapan Barang",
      nextStage: "Pengemasan",
      nextStep: "Pesanan akan dikemas setelah lulus pemeriksaan kualitas.",
      blockingReason: null,
      warning: warnings[0] ?? null,
      isTerminal: false,
      warnings
    });
  }

  if (["ready_for_production", "in_production", "production", "proses_produksi", "masuk_produksi"].includes(operationalStatus)) {
    return finish(input, {
      activeStage: "production",
      responsibility: "debroder",
      tone: "processing",
      customerStatusLabel: "Produksi",
      adminStatusLabel: "Produksi Berjalan",
      customerTitle: "Pesanan sedang diproduksi",
      customerDescription: "Tim produksi sedang mengerjakan pesanan berdasarkan spesifikasi yang telah disetujui.",
      adminTaskType: "run_production",
      primaryAction: "run_production",
      secondaryAction: "track",
      previousStage: "Surat Perintah Kerja",
      nextStage: "Pemeriksaan Kualitas",
      nextStep: "Hasil produksi akan masuk ke pemeriksaan kualitas.",
      blockingReason: null,
      warning: warnings[0] ?? null,
      isTerminal: false,
      warnings
    });
  }

  // Verified/post-payment facts outrank stale order status.
  if (input.paymentRequirementMet || PAYMENT_VERIFIED.has(paymentStatus)) {
    if (input.isCustom) {
      if (!input.hasJobOrder || jobStatus === "draft") {
        return finish(input, {
          activeStage: "job_order_required",
          responsibility: "debroder",
          tone: "processing",
          customerStatusLabel: "Pembayaran Terverifikasi",
          adminStatusLabel: "Buat Surat Perintah Kerja",
          customerTitle: "Pembayaran terverifikasi",
          customerDescription: "Dana sudah dikonfirmasi. Tim DEBRODER sedang menyiapkan Surat Perintah Kerja.",
          adminTaskType: "create_job_order",
          primaryAction: "create_job_order",
          secondaryAction: "track",
          previousStage: "Pembayaran Terverifikasi",
          nextStage: "Produksi",
          nextStep: "Pesanan akan masuk ke produksi setelah Surat Perintah Kerja diterbitkan.",
          blockingReason: null,
          warning: warnings[0] ?? null,
          isTerminal: false,
          warnings
        });
      }
      if (["ready", "released", "in_progress", "started", "production", "in_production"].includes(jobStatus)
        && !["completed", "done"].includes(jobStatus)) {
        return finish(input, {
          activeStage: "production",
          responsibility: "debroder",
          tone: "processing",
          customerStatusLabel: "Produksi",
          adminStatusLabel: "Produksi Berjalan",
          customerTitle: "Pesanan sedang diproduksi",
          customerDescription: "Tim produksi sedang mengerjakan pesanan berdasarkan spesifikasi yang telah disetujui.",
          adminTaskType: "run_production",
          primaryAction: "run_production",
          secondaryAction: "track",
          previousStage: "Surat Perintah Kerja",
          nextStage: "Pemeriksaan Kualitas",
          nextStep: "Hasil produksi akan masuk ke pemeriksaan kualitas.",
          blockingReason: null,
          warning: warnings[0] ?? null,
          isTerminal: false,
          warnings
        });
      }
      if (["completed", "done"].includes(jobStatus)
        && (!qcStatus || !["completed", "passed", "lulus"].includes(qcStatus))) {
        return finish(input, {
          activeStage: "quality_control",
          responsibility: "debroder",
          tone: "processing",
          customerStatusLabel: "Pemeriksaan Kualitas",
          adminStatusLabel: "Lakukan Pemeriksaan Kualitas",
          customerTitle: "Pemeriksaan kualitas",
          customerDescription: "Tim DEBRODER sedang memastikan hasil sesuai spesifikasi pesanan.",
          adminTaskType: "run_quality_control",
          primaryAction: "run_quality_control",
          secondaryAction: "track",
          previousStage: "Produksi",
          nextStage: "Pengemasan",
          nextStep: "Pesanan akan dikemas setelah lulus pemeriksaan kualitas.",
          blockingReason: null,
          warning: warnings[0] ?? null,
          isTerminal: false,
          warnings
        });
      }
      if (["completed", "done"].includes(jobStatus)
        && ["completed", "passed", "lulus"].includes(qcStatus)) {
        return finish(input, {
          activeStage: "packing",
          responsibility: "debroder",
          tone: "processing",
          customerStatusLabel: "Pengemasan",
          adminStatusLabel: "Siapkan Pengemasan",
          customerTitle: "Pesanan siap dikemas",
          customerDescription: "Produksi dan pemeriksaan kualitas selesai. Tim DEBRODER sedang menyiapkan pengemasan.",
          adminTaskType: "pack_order",
          primaryAction: "pack_order",
          secondaryAction: "track",
          previousStage: "Pemeriksaan Kualitas",
          nextStage: "Pengecekan Akhir",
          nextStep: "Setelah dikemas, pesanan masuk ke pengecekan akhir.",
          blockingReason: null,
          warning: warnings[0] ?? null,
          isTerminal: false,
          warnings
        });
      }
    }

    if (fulfillmentStatus === "ready_for_pickup") {
      return finish(input, {
        activeStage: "ready_for_pickup",
        responsibility: "customer",
        tone: "action",
        customerStatusLabel: "Barang Siap Diambil",
        adminStatusLabel: "Menunggu Serah Terima",
        customerTitle: isPayAtStore ? "Barang siap diambil dan dibayar di toko" : "Barang siap diambil",
        customerDescription: "Hubungi Admin sebelum berangkat dan tunjukkan nomor pesanan saat tiba di toko.",
        adminTaskType: "handover_pickup",
        primaryAction: "handover_pickup",
        secondaryAction: "track",
        previousStage: "Pengecekan Akhir",
        nextStage: "Serah Terima",
        nextStep: isPayAtStore
          ? "Pembayaran dikonfirmasi oleh Admin saat barang diserahkan."
          : "Setelah barang diserahkan, pesanan akan ditandai selesai.",
        blockingReason: null,
        warning: warnings[0] ?? null,
        isTerminal: false,
        warnings
      });
    }

    if (["ready_to_ship", "shipped", "in_transit"].includes(fulfillmentStatus)) {
      const shipped = ["shipped", "in_transit"].includes(fulfillmentStatus);
      return finish(input, {
        activeStage: shipped ? "shipping" : "ready_to_ship",
        responsibility: shipped ? "none" : "debroder",
        tone: "processing",
        customerStatusLabel: shipped ? "Sedang Dikirim" : "Siap Dikirim",
        adminStatusLabel: shipped ? "Pengiriman Berjalan" : "Serahkan ke Kurir",
        customerTitle: shipped ? "Pesanan sedang dikirim" : "Pesanan siap dikirim",
        customerDescription: shipped
          ? "Paket sudah diserahkan kepada kurir dan sedang menuju alamat penerima."
          : "Paket telah melalui pengecekan akhir dan menunggu diserahkan kepada kurir.",
        adminTaskType: shipped ? null : "dispatch_shipping",
        primaryAction: shipped ? "track_only" : "dispatch_order",
        secondaryAction: "track",
        previousStage: "Pengecekan Akhir",
        nextStage: shipped ? "Pesanan Diterima" : "Pengiriman",
        nextStep: input.trackingNumber
          ? "Gunakan nomor resi untuk memantau paket sampai diterima."
          : "Nomor resi akan tampil setelah tersedia.",
        blockingReason: null,
        warning: warnings[0] ?? null,
        isTerminal: false,
        warnings
      });
    }

    return finish(input, {
      activeStage: input.isCustom ? "job_order_required" : "preparing_goods",
      responsibility: "debroder",
      tone: "processing",
      customerStatusLabel: input.isCustom ? "Pembayaran Terverifikasi" : "Persiapan Barang",
      adminStatusLabel: input.isCustom ? "Buat Surat Perintah Kerja" : "Siapkan Barang",
      customerTitle: input.isCustom ? "Pembayaran terverifikasi" : "Barang sedang disiapkan",
      customerDescription: input.isCustom
        ? "Dana sudah dikonfirmasi. Tim DEBRODER sedang menyiapkan proses produksi."
        : "Tim DEBRODER sedang memastikan produk, warna, ukuran, jumlah, dan kondisi barang.",
      adminTaskType: input.isCustom ? "create_job_order" : "prepare_ready_stock",
      primaryAction: input.isCustom ? "create_job_order" : "prepare_goods",
      secondaryAction: "track",
      previousStage: "Pembayaran Terverifikasi",
      nextStage: input.isCustom ? "Surat Perintah Kerja" : isPickup ? "Siap Diambil" : "Pemeriksaan Barang",
      nextStep: input.isCustom
        ? "Pesanan akan masuk ke produksi setelah Surat Perintah Kerja diterbitkan."
        : isPickup
          ? "Barang akan ditandai siap diambil setelah pemeriksaan selesai."
          : "Barang akan diperiksa dan dikemas sebelum dikirim.",
      blockingReason: null,
      warning: warnings[0] ?? null,
      isTerminal: false,
      warnings
    });
  }

  // Customer proof submission outranks stale quotation/order stage, but never equals verified funds.
  if (PAYMENT_PENDING.has(paymentStatus) || PAYMENT_PENDING.has(reviewOutcome)) {
    return finish(input, {
      activeStage: "payment_review",
      responsibility: "debroder",
      tone: "processing",
      customerStatusLabel: "Pembayaran Sedang Diperiksa",
      adminStatusLabel: "Periksa Pembayaran",
      customerTitle: "Pembayaran sedang diperiksa",
      customerDescription: "Bukti sudah diterima. Admin sedang mencocokkannya dengan mutasi rekening DEBRODER.",
      adminTaskType: "review_payment",
      primaryAction: "review_payment",
      secondaryAction: "track",
      previousStage: "Bukti Pembayaran Dikirim",
      nextStage: postPaymentStage,
      nextStep: `Setelah dana ditemukan, pesanan masuk ke ${postPaymentStage}.`,
      blockingReason: "Bukti pembayaran belum menjadi konfirmasi dana masuk.",
      warning: warnings[0] ?? null,
      isTerminal: false,
      warnings
    });
  }

  if (PAYMENT_CORRECTION.has(paymentStatus) || PAYMENT_CORRECTION.has(reviewOutcome)) {
    return finish(input, {
      activeStage: "payment_correction",
      responsibility: "customer",
      tone: "warning",
      customerStatusLabel: "Perbaiki Pembayaran",
      adminStatusLabel: "Menunggu Perbaikan Pelanggan",
      customerTitle: "Pembayaran perlu diperbaiki",
      customerDescription: "Periksa catatan Admin, lalu kirim kembali laporan pembayaran melalui pesanan yang sama.",
      adminTaskType: null,
      primaryAction: "resubmit_payment",
      secondaryAction: "track",
      previousStage: "Pemeriksaan Pembayaran",
      nextStage: "Pemeriksaan Ulang",
      nextStep: "Bukti baru akan diperiksa kembali melalui mutasi rekening.",
      blockingReason: "Data atau bukti pembayaran belum dapat diverifikasi.",
      warning: warnings[0] ?? null,
      isTerminal: false,
      warnings
    });
  }

  if (paymentStatus === "partially_paid") {
    return finish(input, {
      activeStage: "payment_balance_due",
      responsibility: "customer",
      tone: "action",
      customerStatusLabel: "Sisa Pembayaran",
      adminStatusLabel: "Menunggu Sisa Pembayaran",
      customerTitle: "Selesaikan sisa pembayaran",
      customerDescription: "Sebagian pembayaran sudah terverifikasi. Bayar sisa tagihan melalui tautan pesanan yang sama.",
      adminTaskType: null,
      primaryAction: "open_payment",
      secondaryAction: "track",
      previousStage: "Pembayaran Sebagian",
      nextStage: postPaymentStage,
      nextStep: `Setelah syarat pembayaran terpenuhi, pesanan masuk ke ${postPaymentStage}.`,
      blockingReason: "Syarat pembayaran belum terpenuhi.",
      warning: warnings[0] ?? null,
      isTerminal: false,
      warnings
    });
  }

  if (orderStatus === "awaiting_payment" && !isPayAtStore) {
    return finish(input, {
      activeStage: "payment_pending",
      responsibility: "customer",
      tone: "action",
      customerStatusLabel: "Menunggu Pembayaran",
      adminStatusLabel: input.hasPaymentUrl ? "Menunggu Pembayaran Pelanggan" : "Siapkan Instruksi Pembayaran",
      customerTitle: input.hasPaymentUrl ? "Selesaikan pembayaran" : "Instruksi pembayaran sedang disiapkan",
      customerDescription: input.hasPaymentUrl
        ? "Buka instruksi pembayaran, transfer sesuai total tagihan, lalu unggah bukti."
        : "Pesanan tetap tersimpan. Hubungi Admin bila instruksi belum tersedia.",
      adminTaskType: input.hasPaymentUrl ? null : "resolve_integrity",
      primaryAction: input.hasPaymentUrl ? "open_payment" : "contact_admin",
      secondaryAction: "track",
      previousStage: input.isCustom ? "Penawaran Disetujui" : "Pesanan Dikonfirmasi",
      nextStage: "Pemeriksaan Pembayaran",
      nextStep: `Setelah bukti dikirim, Admin akan memeriksa mutasi sebelum pesanan masuk ke ${postPaymentStage}.`,
      blockingReason: input.hasPaymentUrl ? null : "Tautan pembayaran belum tersedia.",
      warning: warnings[0] ?? null,
      isTerminal: false,
      warnings
    });
  }

  if (orderStatus === "awaiting_customer_approval") {
    return finish(input, {
      activeStage: "customer_approval",
      responsibility: "customer",
      tone: "action",
      customerStatusLabel: "Menunggu Persetujuan Anda",
      adminStatusLabel: "Menunggu Persetujuan Pelanggan",
      customerTitle: input.isCustom ? "Periksa dan setujui penawaran" : "Periksa dan setujui total pesanan",
      customerDescription: input.isCustom
        ? "Pastikan produk, layanan, desain, jumlah, dan total penawaran sudah sesuai."
        : "Pastikan ongkir, layanan pengiriman, dan total akhir sudah sesuai.",
      adminTaskType: null,
      primaryAction: input.isCustom ? "approve_quote" : "approve_total",
      secondaryAction: "track",
      previousStage: input.isCustom ? "Penetapan Harga" : "Penetapan Ongkir",
      nextStage: "Pembayaran",
      nextStep: "Setelah disetujui, instruksi pembayaran akan tersedia.",
      blockingReason: "Keputusan pelanggan belum diterima.",
      warning: warnings[0] ?? null,
      isTerminal: false,
      warnings
    });
  }

  if (orderStatus === "pending_confirmation" || (!input.whatsappConfirmed && orderStatus === "baru")) {
    return finish(input, {
      activeStage: "whatsapp_confirmation",
      responsibility: "customer",
      tone: "action",
      customerStatusLabel: "Verifikasi WhatsApp",
      adminStatusLabel: "Menunggu Verifikasi Pelanggan",
      customerTitle: "Verifikasi nomor WhatsApp",
      customerDescription: "Konfirmasi nomor yang digunakan saat checkout agar pesanan dapat diproses dengan aman.",
      adminTaskType: null,
      primaryAction: "verify_whatsapp",
      secondaryAction: "track",
      previousStage: "Pesanan Dibuat",
      nextStage: "Pemeriksaan Pesanan",
      nextStep: input.isCustom ? "Admin akan memeriksa pesanan custom." : "Stok akan diperiksa dan disimpan sementara.",
      blockingReason: "Nomor WhatsApp pelanggan belum terverifikasi.",
      warning: warnings[0] ?? null,
      isTerminal: false,
      warnings
    });
  }

  if (orderStatus === "awaiting_shipping_quote") {
    return finish(input, {
      activeStage: "shipping_quote",
      responsibility: "debroder",
      tone: "processing",
      customerStatusLabel: "Ongkir Sedang Ditetapkan",
      adminStatusLabel: "Tetapkan Ongkir",
      customerTitle: "Ongkir sedang ditetapkan",
      customerDescription: "Admin sedang memilih kurir, layanan, biaya, dan estimasi pengiriman.",
      adminTaskType: "set_shipping_quote",
      primaryAction: "set_shipping_quote",
      secondaryAction: "track",
      previousStage: "Pesanan Diterima",
      nextStage: "Persetujuan Total",
      nextStep: "Anda akan diminta memeriksa dan menyetujui total akhir.",
      blockingReason: null,
      warning: warnings[0] ?? null,
      isTerminal: false,
      warnings
    });
  }

  if (orderStatus === "under_review" || orderStatus === "baru") {
    const quoteReady = input.isCustom && normalized(input.customQuoteStatus) === "draft";
    return finish(input, {
      activeStage: quoteReady ? "custom_pricing" : "order_review",
      responsibility: "debroder",
      tone: "processing",
      customerStatusLabel: input.isCustom ? "Pesanan Custom Sedang Diperiksa" : "Pesanan Sedang Diperiksa",
      adminStatusLabel: quoteReady ? "Tetapkan Harga" : input.isCustom ? "Periksa Pesanan Custom" : "Periksa Pesanan Baru",
      customerTitle: input.isCustom ? "Pesanan custom sedang diperiksa" : "Pesanan sedang diperiksa",
      customerDescription: input.isCustom
        ? "Admin sedang memeriksa produk, layanan, file, desain, waktu pengerjaan, dan harga."
        : "Admin sedang memeriksa data pesanan dan ketersediaan barang.",
      adminTaskType: quoteReady ? "prepare_custom_quote" : input.isCustom ? "review_custom_order" : "review_new_order",
      primaryAction: quoteReady ? "prepare_quote" : "review_order",
      secondaryAction: "track",
      previousStage: "Pesanan Diterima",
      nextStage: input.isCustom ? "Penetapan Harga" : isShipping ? "Penetapan Ongkir" : isPayAtStore ? "Persiapan Barang" : "Pembayaran",
      nextStep: input.isCustom ? "Berikutnya adalah penetapan harga." : "Berikutnya adalah konfirmasi stok dan metode penyerahan.",
      blockingReason: null,
      warning: warnings[0] ?? null,
      isTerminal: false,
      warnings
    });
  }

  if (isPayAtStore && isPickup) {
    return finish(input, {
      activeStage: "preparing_goods",
      responsibility: "debroder",
      tone: "processing",
      customerStatusLabel: "Persiapan Barang",
      adminStatusLabel: "Siapkan Barang Pickup",
      customerTitle: "Barang sedang disiapkan untuk diambil",
      customerDescription: "Anda belum perlu melakukan transfer. Tunggu konfirmasi barang siap sebelum datang ke toko.",
      adminTaskType: "prepare_ready_stock",
      primaryAction: "prepare_goods",
      secondaryAction: "track",
      previousStage: "Pesanan Diterima",
      nextStage: "Siap Diambil",
      nextStep: "Pembayaran dilakukan di toko saat barang sudah siap diserahkan.",
      blockingReason: null,
      warning: warnings[0] ?? null,
      isTerminal: false,
      warnings
    });
  }

  return finish(input, {
    activeStage: "integrity_review",
    responsibility: "debroder",
    tone: "warning",
    customerStatusLabel: "Status Sedang Diperbarui",
    adminStatusLabel: "Periksa Integritas Pesanan",
    customerTitle: "Status pesanan sedang diperbarui",
    customerDescription: "Pesanan tetap tersimpan. Tim DEBRODER sedang memperbarui tahap operasionalnya.",
    adminTaskType: "resolve_integrity",
    primaryAction: "review_order",
    secondaryAction: "track",
    previousStage: "Pesanan Diterima",
    nextStage: "Tahap Berikutnya",
    nextStep: "Periksa kembali halaman pelacakan untuk pembaruan terbaru.",
    blockingReason: "Kombinasi status belum dapat dipetakan dengan aman.",
    warning: warnings[0] ?? "Status memerlukan pemeriksaan manual.",
    isTerminal: false,
    warnings: warnings.length ? warnings : ["Status memerlukan pemeriksaan manual."]
  });
}
