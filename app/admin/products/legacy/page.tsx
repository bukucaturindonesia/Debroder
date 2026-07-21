import Link from "next/link";
import { ProductAdminPanel } from "@/components/admin/ProductAdmin";

export const dynamic = "force-dynamic";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function LegacyProductEditorPage({
  searchParams
}: {
  searchParams: Promise<{ productId?: string; "new"?: string }>;
}) {
  const params = await searchParams;
  const productId = params.productId && UUID_PATTERN.test(params.productId)
    ? params.productId
    : null;

  return (
    <div className="grid gap-6">
      <section className="border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950">
        <p className="font-semibold">Editor lama sementara — dipertahankan selama Product Workspace dibangun bertahap.</p>
        <p className="mt-1">
          Gunakan <Link href="/admin/products" className="font-semibold underline">Product Library</Link> untuk mencari dan memilih produk.
          Editor ini belum boleh dihapus sebelum WP-08 dan approval owner.
        </p>
      </section>
      <ProductAdminPanel initialProductId={productId} startNew={params.new === "1"} />
    </div>
  );
}
