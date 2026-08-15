import type { Metadata } from "next";
import { CheckoutClient } from "@/components/checkout/CheckoutClient";
import { PublicShell } from "@/components/PublicPage";
import { getPublicContent } from "@/lib/public-data";

export const metadata: Metadata = {
  title: "Checkout | DEBRODER",
  description: "Checkout cepat dan aman untuk produk siap beli dan pesanan custom DEBRODER.",
  robots: { index: false, follow: false }
};

// Keep the transactional boundary request-dynamic even though its store
// options come from a public, short-lived cache.
export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const content = await getPublicContent();
  const stores = content.stores
    .filter((store) => store.id && store.status_aktif)
    .map((store) => ({ id: store.id as string, name: store.nama_store, address: store.alamat, hours: store.jam_operasional ?? "" }));

  return (
    <PublicShell theme="jersey-commerce">
      <CheckoutClient stores={stores} />
    </PublicShell>
  );
}
