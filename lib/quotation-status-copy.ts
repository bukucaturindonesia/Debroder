export type QuotationAudience = "admin" | "public";

export type QuotationStatusCopy = {
  adminLabel: string;
  adminDescription: string;
  publicLabel: string;
  publicDescription: string;
};

export type QuotationStatusTransition = {
  value: string;
  label: string;
  description: string;
  buttonLabel: string;
  noteRequired?: boolean;
  notePlaceholder: string;
};

export const QUOTATION_STATUS_KEYS = [
  "draft",
  "submitted",
  "under_review",
  "pricing",
  "sent",
  "revision_requested",
  "approved",
  "rejected",
  "expired",
  "converted_to_order"
] as const;

const STATUS_COPY: Record<string, QuotationStatusCopy> = {
  draft: {
    adminLabel: "Draft Penawaran",
    adminDescription:
      "Penawaran masih disusun. Data pelanggan, produk, layanan, dan harga masih dapat diedit.",
    publicLabel: "Sedang Disiapkan",
    publicDescription:
      "Tim DEBRODER sedang menyiapkan rincian penawaran Anda."
  },
  submitted: {
    adminLabel: "Sudah Diajukan",
    adminDescription:
      "Penawaran sudah diajukan dan sedang menunggu pemeriksaan oleh admin.",
    publicLabel: "Sedang Diproses",
    publicDescription:
      "Penawaran Anda sudah kami terima dan sedang masuk antrean pemeriksaan."
  },
  under_review: {
    adminLabel: "Sedang Diperiksa",
    adminDescription:
      "Admin sedang memeriksa data pelanggan, produk, layanan, harga, dan catatan penawaran.",
    publicLabel: "Sedang Ditinjau",
    publicDescription:
      "Tim DEBRODER sedang memeriksa rincian kebutuhan Anda."
  },
  pricing: {
    adminLabel: "Harga Sedang Disusun",
    adminDescription:
      "Admin sedang memastikan harga produk, layanan, biaya tambahan, dan potongan.",
    publicLabel: "Harga Sedang Disiapkan",
    publicDescription:
      "Kami sedang menyusun rincian harga untuk kebutuhan Anda."
  },
  sent: {
    adminLabel: "Sudah Dikirim ke Pelanggan",
    adminDescription:
      "Penawaran telah dikirim dan sedang menunggu keputusan atau permintaan revisi dari pelanggan.",
    publicLabel: "Penawaran Sudah Dikirim",
    publicDescription:
      "Penawaran sudah tersedia untuk Anda periksa."
  },
  revision_requested: {
    adminLabel: "Revisi Diminta Pelanggan",
    adminDescription:
      "Pelanggan meminta perubahan. Buat versi revisi baru sebelum mengubah isi penawaran.",
    publicLabel: "Sedang Direvisi",
    publicDescription:
      "Permintaan perubahan Anda sedang diproses oleh tim DEBRODER."
  },
  approved: {
    adminLabel: "Disetujui Pelanggan",
    adminDescription:
      "Pelanggan menyetujui versi penawaran terbaru. Penawaran siap dilanjutkan menjadi pesanan.",
    publicLabel: "Penawaran Disetujui",
    publicDescription:
      "Penawaran telah disetujui dan akan dilanjutkan ke proses pesanan."
  },
  rejected: {
    adminLabel: "Tidak Dilanjutkan Pelanggan",
    adminDescription:
      "Pelanggan memilih tidak melanjutkan penawaran ini.",
    publicLabel: "Penawaran Tidak Dilanjutkan",
    publicDescription:
      "Penawaran ini tidak dilanjutkan."
  },
  expired: {
    adminLabel: "Masa Berlaku Berakhir",
    adminDescription:
      "Masa berlaku penawaran telah berakhir. Buat penawaran atau versi baru untuk melanjutkan.",
    publicLabel: "Masa Berlaku Berakhir",
    publicDescription:
      "Masa berlaku penawaran ini telah berakhir. Hubungi DEBRODER untuk pembaruan."
  },
  converted_to_order: {
    adminLabel: "Sudah Menjadi Pesanan",
    adminDescription:
      "Penawaran telah dikonversi menjadi pesanan dan masuk ke proses berikutnya.",
    publicLabel: "Pesanan Sedang Diproses",
    publicDescription:
      "Penawaran telah menjadi pesanan dan masuk ke proses selanjutnya."
  },
  superseded: {
    adminLabel: "Digantikan Versi Baru",
    adminDescription:
      "Versi ini tetap disimpan sebagai riwayat, tetapi sudah digantikan oleh versi yang lebih baru.",
    publicLabel: "Versi Sebelumnya",
    publicDescription:
      "Versi ini telah digantikan oleh versi penawaran yang lebih baru."
  }
};

const STATUS_TRANSITIONS: Record<string, QuotationStatusTransition[]> = {
  draft: [
    {
      value: "submitted",
      label: "Ajukan untuk diperiksa",
      description:
        "Gunakan setelah data awal penawaran sudah lengkap dan siap diperiksa oleh admin.",
      buttonLabel: "Ajukan Penawaran",
      notePlaceholder: "Catatan tambahan untuk admin pemeriksa, bila diperlukan"
    }
  ],
  submitted: [
    {
      value: "under_review",
      label: "Mulai pemeriksaan",
      description:
        "Tandai bahwa admin sudah mulai memeriksa kelengkapan dan ketepatan isi penawaran.",
      buttonLabel: "Mulai Pemeriksaan",
      notePlaceholder: "Catatan pemeriksaan awal, bila diperlukan"
    },
    {
      value: "draft",
      label: "Kembalikan ke draft",
      description:
        "Gunakan ketika data penawaran masih perlu diperbaiki sebelum pemeriksaan dilanjutkan.",
      buttonLabel: "Kembalikan ke Draft",
      notePlaceholder: "Jelaskan bagian yang perlu diperbaiki"
    }
  ],
  under_review: [
    {
      value: "pricing",
      label: "Lanjutkan ke penyusunan harga",
      description:
        "Gunakan setelah data pelanggan, produk, layanan, dan catatan sudah diperiksa.",
      buttonLabel: "Mulai Susun Harga",
      notePlaceholder: "Catatan untuk penyusunan harga, bila diperlukan"
    },
    {
      value: "submitted",
      label: "Kembalikan ke antrean pemeriksaan",
      description:
        "Gunakan ketika pemeriksaan belum dapat dilanjutkan atau perlu dialihkan kembali.",
      buttonLabel: "Kembalikan ke Diajukan",
      notePlaceholder: "Jelaskan alasan pengembalian, bila diperlukan"
    }
  ],
  pricing: [
    {
      value: "sent",
      label: "Tandai sudah dikirim ke pelanggan",
      description:
        "Gunakan hanya setelah penawaran benar-benar dikirim kepada pelanggan melalui kanal yang dipilih.",
      buttonLabel: "Tandai Sudah Dikirim",
      notePlaceholder: "Contoh: dikirim melalui WhatsApp pada pukul 14.30"
    },
    {
      value: "under_review",
      label: "Kembalikan ke pemeriksaan",
      description:
        "Gunakan ketika ada data produk, layanan, atau catatan yang perlu diperiksa ulang.",
      buttonLabel: "Kembalikan ke Pemeriksaan",
      notePlaceholder: "Jelaskan bagian yang perlu diperiksa ulang"
    }
  ],
  sent: [
    {
      value: "approved",
      label: "Tandai disetujui pelanggan",
      description:
        "Gunakan setelah pelanggan menyetujui versi penawaran terbaru.",
      buttonLabel: "Tandai Disetujui",
      notePlaceholder: "Catatan persetujuan pelanggan, bila diperlukan"
    },
    {
      value: "revision_requested",
      label: "Catat permintaan revisi",
      description:
        "Gunakan ketika pelanggan meminta perubahan jumlah, produk, layanan, harga, atau catatan.",
      buttonLabel: "Catat Permintaan Revisi",
      noteRequired: true,
      notePlaceholder: "Wajib: tuliskan perubahan yang diminta pelanggan"
    },
    {
      value: "rejected",
      label: "Tandai tidak dilanjutkan",
      description:
        "Gunakan ketika pelanggan menyatakan tidak melanjutkan penawaran.",
      buttonLabel: "Tandai Tidak Dilanjutkan",
      noteRequired: true,
      notePlaceholder: "Wajib: tuliskan alasan pelanggan tidak melanjutkan"
    },
    {
      value: "expired",
      label: "Tandai masa berlaku berakhir",
      description:
        "Gunakan ketika masa berlaku penawaran telah berakhir. Catatan wajib jika diakhiri sebelum tanggal berlaku.",
      buttonLabel: "Tandai Masa Berlaku Berakhir",
      notePlaceholder: "Jelaskan alasan jika masa berlaku diakhiri lebih awal"
    }
  ]
};

export function getQuotationStatusCopy(status: string): QuotationStatusCopy {
  return (
    STATUS_COPY[status] || {
      adminLabel: "Status Tidak Dikenal",
      adminDescription:
        "Status penawaran tidak dikenali. Muat ulang halaman atau hubungi Super Admin.",
      publicLabel: "Status Sedang Diperbarui",
      publicDescription:
        "Status penawaran sedang diperbarui. Silakan periksa kembali beberapa saat lagi."
    }
  );
}

export function getQuotationStatusLabel(
  status: string,
  audience: QuotationAudience = "admin"
) {
  const copy = getQuotationStatusCopy(status);
  return audience === "public" ? copy.publicLabel : copy.adminLabel;
}

export function getQuotationStatusDescription(
  status: string,
  audience: QuotationAudience = "admin"
) {
  const copy = getQuotationStatusCopy(status);
  return audience === "public"
    ? copy.publicDescription
    : copy.adminDescription;
}

export function getQuotationStatusOptions() {
  return QUOTATION_STATUS_KEYS.map(
    (status) => [status, getQuotationStatusLabel(status, "admin")] as const
  );
}

export function getQuotationStatusTransitions(status: string) {
  return STATUS_TRANSITIONS[status] || [];
}

export function getQuotationVersionStatusLabel(status: string) {
  return getQuotationStatusLabel(status, "admin");
}

export function getQuotationStatusErrorMessage(rawMessage?: string) {
  const message = (rawMessage || "").toLowerCase();

  if (message.includes("customer contact is required")) {
    return "Lengkapi nama pelanggan dan nomor WhatsApp sebelum penawaran dikirim.";
  }

  if (message.includes("at least one active quotation item")) {
    return "Tambahkan minimal satu produk aktif sebelum penawaran dikirim.";
  }

  if (
    message.includes("pending pricing cannot be approved") ||
    message.includes("pending item pricing cannot be approved")
  ) {
    return "Penawaran belum dapat disetujui karena masih ada harga yang menunggu kepastian.";
  }

  if (message.includes("a note is required")) {
    return "Catatan perubahan wajib diisi untuk tindakan ini.";
  }

  if (message.includes("latest quotation version has not been sent")) {
    return "Versi terbaru belum dikirim kepada pelanggan. Kirim versi terbaru sebelum mencatat persetujuan.";
  }

  if (message.includes("invalid quotation transition")) {
    return "Perubahan status tidak sesuai dengan alur penawaran saat ini. Muat ulang halaman dan periksa status terbaru.";
  }

  if (
    message.includes("quotation not found") ||
    message.includes("quotation not found or archived")
  ) {
    return "Penawaran tidak ditemukan atau sudah dipindahkan ke Gudang Arsip.";
  }

  if (message.includes("early expiration requires")) {
    return "Isi alasan karena masa berlaku akan diakhiri sebelum tanggal yang ditentukan.";
  }

  return "Status penawaran belum berhasil diperbarui. Periksa kelengkapan data, harga, dan catatan lalu coba kembali.";
}
