import { SiteHeaderClient } from "@/components/header/SiteHeaderClient";
import type { PublicNavigationFacets } from "@/lib/public-navigation";

export function SiteHeader({
  navigationFacets
}: {
  navigationFacets?: PublicNavigationFacets;
}) {
  return <SiteHeaderClient navigationFacets={navigationFacets} />;
}
