import type { Metadata } from "next";
import { KaosPolosEditorialExperience } from "@/components/KaosPolosEditorialExperience";
import { PublicShell } from "@/components/PublicPage";
import { getCatalogPageModel } from "@/lib/catalog-page/runtime";
import { kaosTypeOptions } from "@/lib/product-taxonomy";

export const metadata: Metadata = {
  title: "Kaos Polos | DEBRODER",
  description: "DE BRODER menyediakan kaos polos, kaos NSA, dan cotton combed untuk sablon, brand clothing, komunitas, event, dan pembelian partai.",
  alternates: { canonical: "/kaos-polos" }
};

type KaosPolosPageProps = {
  searchParams?: Promise<{
    color?: string | string[];
    size?: string | string[];
    price?: string | string[];
    status?: string | string[];
    label?: string | string[];
    sort?: string | string[];
    type?: string | string[];
  }>;
};

export default async function KaosPolosPage({ searchParams }: KaosPolosPageProps) {
  const model = await getCatalogPageModel({
    routeKey: "kaos-polos",
    productTypeOptions: kaosTypeOptions,
    searchParams: searchParams ? await searchParams : {}
  });

  return (
    <PublicShell>
      <KaosPolosEditorialExperience model={model} />
    </PublicShell>
  );
}
