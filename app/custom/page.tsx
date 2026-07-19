import type { Metadata } from "next";
import { CustomHub } from "@/components/custom/CustomHub";
import { PublicShell } from "@/components/PublicPage";
import { listCustomCategories } from "@/lib/custom-commerce/data";
import { getPublicContent } from "@/lib/public-data";

export const metadata: Metadata = {
  title: "Pesanan Custom | DEBRODER",
  description: "Pilih kategori dan susun pesanan custom DEBRODER dari produk, varian, layanan, serta rincian harga yang tersedia.",
  alternates: { canonical: "/custom" }
};

export default async function CustomPage() {
  const [content, categories] = await Promise.all([getPublicContent(), listCustomCategories()]);
  return <PublicShell content={content}><main className="min-h-screen bg-[#f6f5f0]"><CustomHub categories={categories} /></main></PublicShell>;
}
