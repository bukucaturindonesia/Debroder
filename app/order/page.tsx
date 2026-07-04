import type { Metadata } from "next";
import { OrderForm } from "@/components/OrderForm";
import { PublicShell } from "@/components/PublicPage";
import { getPublicContent } from "@/lib/public-data";

export const metadata: Metadata = {
  title: "Pesan Produk | DEBRODER",
  description: "Form pemesanan produk dan apparel DEBRODER.",
  alternates: { canonical: "/order" }
};

export default async function OrderPage({ searchParams }: { searchParams: Promise<{ product?: string }> }) {
  const [content, query] = await Promise.all([getPublicContent(), searchParams]);
  return (
    <PublicShell content={content}>
      <main className="bg-brand-offWhite py-10 sm:py-16">
        <div className="section-shell">
          <OrderForm products={content.products} initialProduct={query.product} />
        </div>
      </main>
    </PublicShell>
  );
}
