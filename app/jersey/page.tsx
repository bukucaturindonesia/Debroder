import type { Metadata } from "next";
import { JerseyChrome } from "@/components/jersey/JerseyChrome";
import { JerseyExperience } from "@/components/jersey/JerseyExperience";
import { PublicShell } from "@/components/PublicPage";
import { fallbackCategories } from "@/lib/fallback-data";
import { getPublicContent } from "@/lib/public-data";

export const metadata: Metadata = {
  title: "Jersey untuk Tim, Komunitas & Instansi | DEBRODER",
  description: "Jelajahi Jersey DEBRODER untuk football, futsal, esports, komunitas, sekolah, instansi, event, dan kebutuhan custom tim.",
  alternates: { canonical: "/jersey" }
};

export default async function JerseyPage() {
  const content = await getPublicContent();
  const pageHero = content.pageHeroes.find((hero) => hero.page_key === "jersey");
  const managedCategories = content.categories.filter((category) => category.category_key === "jersey");
  const categories = managedCategories.length
    ? managedCategories
    : fallbackCategories.filter((category) => category.category_key === "jersey");

  return (
    <PublicShell content={content} headerMode="natural" headerExpandedAtTop theme="jersey">
      <JerseyChrome />
      <JerseyExperience content={content} hero={pageHero} categories={categories} />
    </PublicShell>
  );
}
