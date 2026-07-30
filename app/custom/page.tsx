import type { Metadata } from "next";
import { CustomHub } from "@/components/custom/CustomHub";
import { PublicShell } from "@/components/PublicPage";
import { getCatalogPageModel } from "@/lib/catalog-page/runtime";
import { listCustomCategories } from "@/lib/custom-commerce/data";

export const metadata: Metadata = {
  title: "Pesanan Custom | DEBRODER",
  description: "Pilih kategori dan susun pesanan custom DEBRODER dari produk, varian, layanan, serta rincian harga yang tersedia.",
  alternates: { canonical: "/custom" }
};

export default async function CustomPage() {
  const [categories, catalog] = await Promise.all([
    listCustomCategories(),
    getCatalogPageModel({ routeKey: "koleksi", scope: "all", searchParams: {} })
  ]);
  return <PublicShell><CustomHub categories={categories} products={catalog.data.products} /></PublicShell>;
}
