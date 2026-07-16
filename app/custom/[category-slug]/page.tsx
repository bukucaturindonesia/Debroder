import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { CustomProjectBuilder } from "@/components/custom/CustomProjectBuilder";
import { PublicShell } from "@/components/PublicPage";
import { getCustomCategoryCatalog, listCustomCategories, listCustomCategoryCatalogsByIds } from "@/lib/custom-commerce/data";
import { getPublicContent } from "@/lib/public-data";

type PageProps = {
  params: Promise<{ "category-slug": string }>;
  searchParams: Promise<{ product?: string; draft?: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const slug = (await params)["category-slug"];
  const catalog = await getCustomCategoryCatalog(slug);
  if (!catalog) return { title: "Kategori custom tidak ditemukan | DEBRODER", robots: { index: false, follow: false } };
  return {
    title: catalog.category.seoTitle || `${catalog.category.name} Custom | DEBRODER`,
    description: catalog.category.seoDescription || catalog.category.shortDescription || `Rakit ${catalog.category.name} custom di DEBRODER.`,
    alternates: { canonical: `/custom/${catalog.category.slug}` }
  };
}

export default async function CustomCategoryPage({ params, searchParams }: PageProps) {
  const slug = (await params)["category-slug"];
  const [query, content, initialCatalog] = await Promise.all([searchParams, getPublicContent(), getCustomCategoryCatalog(slug)]);
  if (!initialCatalog) notFound();
  if (initialCatalog.category.entryType === "jersey_configurator") {
    if (!initialCatalog.category.targetRoute) notFound();
    redirect(initialCatalog.category.targetRoute);
  }
  if (!initialCatalog.products.length) notFound();
  const categories = await listCustomCategories();
  const catalogs = await listCustomCategoryCatalogsByIds(categories.filter((category) => category.entryType === "project_builder").map((category) => category.id));
  const preselectedProductId = query.product && initialCatalog.products.some((product) => product.id === query.product) ? query.product : null;
  const requestedDraftId = query.draft && /^[a-zA-Z0-9_-]{8,100}$/.test(query.draft) ? query.draft : null;

  return <PublicShell content={content}><main className="min-h-screen bg-[#f6f5f0]">
    <section className="section-shell py-10 sm:py-14"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-black/45">Custom DEBRODER</p><h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-6xl">{initialCatalog.category.name}</h1>{initialCatalog.category.shortDescription ? <p className="mt-4 max-w-3xl text-base leading-8 text-black/60">{initialCatalog.category.shortDescription}</p> : null}<div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold text-black/55"><span className="rounded-full bg-white px-3 py-2">{initialCatalog.category.minimumOrderDisplay}</span><span className="rounded-full bg-white px-3 py-2">{initialCatalog.category.leadTimeDisplay}</span></div></section>
    <CustomProjectBuilder catalogs={catalogs} initialCategoryId={initialCatalog.category.id} preselectedProductId={preselectedProductId} requestedDraftId={requestedDraftId} />
  </main></PublicShell>;
}
