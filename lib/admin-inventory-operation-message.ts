const SAFE_OPERATION_ERROR_PATTERNS = [
  /Pesanan sudah selesai/i,
  /Pesanan terminal/i,
  /Serah terima (?:pickup )?sudah selesai/i,
  /Pickup belum siap diserahkan/i,
  /Persiapan pickup tidak ditemukan/i,
  /Pesanan pickup tidak ditemukan/i,
  /Fulfillment pickup tidak ditemukan/i,
  /Pesanan bukan pickup yang valid/i,
  /Lokasi pickup belum terhubung/i,
  /Stok fisik di lokasi pickup belum lengkap/i,
  /Pengecekan akhir fulfillment wajib selesai/i,
  /Pembayaran belum memenuhi syarat/i,
  /Saldo stok pickup tidak konsisten/i,
  /Pickup tidak dapat dibuka kembali/i,
  /Persiapan pickup tidak dapat diproses/i,
  /Pesanan terminal belum memiliki bukti konsumsi stok pickup lengkap/i
] as const;

export function safeInventoryOperationMessage(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "object" &&
          error !== null &&
          "message" in error &&
          typeof error.message === "string"
        ? error.message
        : "";

  const normalized = message.trim();
  if (!normalized || normalized.length > 240) return null;

  return SAFE_OPERATION_ERROR_PATTERNS.some((pattern) => pattern.test(normalized))
    ? normalized
    : null;
}
