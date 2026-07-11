import type { CartItem } from "@/lib/types";
import { getSiteUrl, getWhatsAppNumber } from "@/lib/env";
import { formatRupiah } from "@/lib/money";
import {
  getCartEstimatedTotal,
  getCartServiceSubtotal,
  getCartSubtotal
} from "@/lib/cart/operations";

interface WhatsAppMessageOptions {
  generalNote?: string;
  quotationNumber?: string;
}

export function buildWhatsAppMessage(
  items: CartItem[],
  options: WhatsAppMessageOptions = {}
): string {
  const productSubtotal = getCartSubtotal(items);
  const serviceSubtotal = getCartServiceSubtotal(items);
  const needsReview = items.some((item) => item.requires_review);
  const lines = [
    needsReview
      ? "Halo DEBRODER, saya ingin minta penawaran:"
      : "Halo DEBRODER, saya ingin pesan:",
    "",
    ...items.flatMap((item, index) => formatCartItemLines(item, index)),
    "",
    `Subtotal produk: ${formatRupiah(productSubtotal)}`,
    `Subtotal custom: ${formatRupiah(serviceSubtotal)}`,
    `Total estimasi: ${formatRupiah(getCartEstimatedTotal(items))}`,
    needsReview ? "Status: perlu review harga final" : "Status: siap diproses",
    options.quotationNumber ? `Quotation: ${options.quotationNumber}` : null,
    options.generalNote ? `Catatan umum: ${options.generalNote}` : null,
    `Link situs: ${getSiteUrl()}`
  ].filter((line): line is string => typeof line === "string");

  return lines.join("\n");
}

export function buildWhatsAppUrl(
  items: CartItem[],
  options: WhatsAppMessageOptions = {}
): string {
  const number = getWhatsAppNumber();
  const message = encodeURIComponent(buildWhatsAppMessage(items, options));
  const baseUrl = number ? `https://wa.me/${number}` : "https://wa.me/";
  return `${baseUrl}?text=${message}`;
}

function formatCartItemLines(item: CartItem, index: number): string[] {
  const lines = [
    `${index + 1}. ${item.nama_produk}`,
    `   Warna/Ukuran: ${item.warna} / ${item.ukuran}`,
    `   SKU: ${item.sku}`,
    `   Qty: ${item.quantity} pcs`,
    `   Harga produk: ${formatRupiah(item.unit_price)} / pcs`
  ];

  if (item.price_tier) {
    lines.push(
      `   Tier: ${item.price_tier.min_quantity}-${
        item.price_tier.max_quantity ?? "+"
      } pcs`
    );
  }

  if (item.services && item.services.length > 0) {
    lines.push("   Custom:");
    for (const service of item.services) {
      const price =
        service.unit_price !== null
          ? `${formatRupiah(service.unit_price)} x ${service.quantity}`
          : service.flat_price !== null
            ? formatRupiah(service.flat_price)
            : "minta penawaran";
      lines.push(`   - ${service.service_name}: ${price}`);
      if (service.note) {
        lines.push(`     Catatan: ${service.note}`);
      }
    }
  }

  if (item.upload_refs && item.upload_refs.length > 0) {
    lines.push(
      `   File desain: ${item.upload_refs
        .map((upload) => upload.file_name)
        .join(", ")}`
    );
  }

  if (item.line_note) {
    lines.push(`   Catatan item: ${item.line_note}`);
  }

  return lines;
}
