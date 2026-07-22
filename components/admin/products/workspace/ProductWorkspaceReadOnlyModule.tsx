"use client";

import { useProductWorkspace } from "@/components/admin/products/workspace/ProductWorkspaceShell";
import {
  PRODUCT_WORKSPACE_MODULES,
  type ProductWorkspaceModule
} from "@/lib/product-workspace";
import { lifecycleLabel } from "@/lib/product-manager";
import { formatRupiah } from "@/lib/url";

const moduleCopy: Record<Exclude<ProductWorkspaceModule, "information">, {
  eyebrow: string;
  title: string;
  description: string;
  milestone: string;
}> = {
  variants: {
    eyebrow: "WP-04",
    title: "Varian",
    description: "Struktur varian belum dapat diubah pada WP-02. Modul ini disediakan agar deep link dan navigasi workspace sudah stabil.",
    milestone: "Pengelolaan warna dan ukuran dibuka pada WP-04."
  },
  inventory: {
    eyebrow: "WP-05",
    title: "Harga & Stok",
    description: "Harga per SKU dan stok berbasis lokasi belum dapat diubah pada WP-02.",
    milestone: "Inventory location-aware dibuka pada WP-05."
  },
  media: {
    eyebrow: "WP-06",
    title: "Media",
    description: "Media per warna belum dapat diunggah, diurutkan, atau dihapus pada WP-02.",
    milestone: "Pengelolaan media per warna dibuka pada WP-06."
  },
  review: {
    eyebrow: "WP-07",
    title: "Review & Publish",
    description: "Validasi readiness, publish, dan archive belum tersedia pada WP-02.",
    milestone: "Review dan lifecycle action dibuka pada WP-07."
  }
};

export function ProductWorkspaceReadOnlyModule({
  module
}: {
  module: ProductWorkspaceModule;
}) {
  const { product } = useProductWorkspace();

  if (module === "information") {
    return (
      <section className="border border-brand-softGray bg-white p-5 sm:p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-charcoal/50">WP-02 READ-ONLY</p>
        <h2 className="mt-2 text-2xl font-semibold">Informasi produk</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-brand-charcoal/65">
          Identitas root produk ditampilkan sebagai referensi. Form editing baru dibuka pada WP-03.
        </p>
        <dl className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <ReadOnlyField label="Nama produk" value={product.name || "-"} />
          <ReadOnlyField label="Slug" value={product.slug || "-"} />
          <ReadOnlyField label="Status" value={lifecycleLabel(product.status)} />
          <ReadOnlyField label="Kategori" value={product.categoryName || "Tanpa kategori"} />
          <ReadOnlyField label="SKU induk" value={product.sku || "Belum ada"} />
          <ReadOnlyField label="Harga dasar" value={formatRupiah(product.basePrice)} />
          <ReadOnlyField
            label="Terakhir diperbarui"
            value={product.updatedAt ? formatTimestamp(product.updatedAt) : "Belum tersedia"}
          />
        </dl>
      </section>
    );
  }

  const copy = moduleCopy[module];
  const moduleLabel = PRODUCT_WORKSPACE_MODULES.find((item) => item.key === module)?.label || copy.title;
  return (
    <section className="border border-brand-softGray bg-white p-5 sm:p-7">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-charcoal/50">{copy.eyebrow} — READ-ONLY SHELL</p>
      <h2 className="mt-2 text-2xl font-semibold">{moduleLabel}</h2>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-brand-charcoal/65">{copy.description}</p>
      <div className="mt-6 border border-dashed border-brand-softGray bg-brand-offWhite p-6 text-sm leading-6">
        <p className="font-semibold">Belum ada aksi pada modul ini.</p>
        <p className="mt-1 text-brand-charcoal/60">{copy.milestone}</p>
      </div>
    </section>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 border border-brand-softGray p-4">
      <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-charcoal/45">{label}</dt>
      <dd className="mt-2 break-words text-sm font-semibold">{value}</dd>
    </div>
  );
}

function formatTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}
