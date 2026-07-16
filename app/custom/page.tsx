import type { Metadata } from "next";
import { CustomHub } from "@/components/custom/CustomHub";
import { PublicShell } from "@/components/PublicPage";
import { listCustomCategories } from "@/lib/custom-commerce/data";
import { getPublicContent } from "@/lib/public-data";

export const metadata: Metadata = {
  title: "Custom Apparel | DEBRODER",
  description: "Pilih kategori dan rakit Custom Project DEBRODER dari produk, varian, layanan, serta harga yang terhubung ke CMS dan PIM.",
  alternates: { canonical: "/custom" }
};

export default async function CustomPage() {
  const [content, categories] = await Promise.all([getPublicContent(), listCustomCategories()]);
  return <PublicShell content={content}><main className="min-h-screen bg-[#f6f5f0]"><CustomHub categories={categories} /></main></PublicShell>;
}
