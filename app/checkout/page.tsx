import type { Metadata } from "next";
import { CheckoutClient } from "@/components/checkout/CheckoutClient";
import { PublicShell } from "@/components/PublicPage";
import { createSupabaseServerClient } from "@/lib/supabase";

export const metadata: Metadata = {
  title: "Checkout | DEBRODER",
  description: "Checkout cepat dan aman untuk produk siap beli dan pesanan custom DEBRODER.",
  robots: { index: false, follow: false }
};

// Fulfillment options must reflect the current public store directory,
// independently of the cached marketing/CMS aggregate.
export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const client = createSupabaseServerClient();
  const result = client ? await client
    .from("stores")
    .select("id,nama_store,alamat")
    .eq("status_aktif", true)
    .or("status.is.null,status.in.(published,active)")
    .order("urutan", { ascending: true }) : null;
  const stores = (result?.error ? [] : result?.data ?? [])
    .map((store) => ({ id: store.id, name: store.nama_store, address: store.alamat, hours: "" }));

  return (
    <PublicShell theme="jersey-commerce">
      <CheckoutClient stores={stores} />
    </PublicShell>
  );
}
