import { SiteHeaderClient } from "@/components/header/SiteHeaderClient";
import { contactLinks } from "@/lib/contact";
import type { PublicNavigationFacets } from "@/lib/public-navigation";
import type { PublicShellPromoViewModel } from "@/lib/public-shell/model";
import { whatsappLinkWithMessage } from "@/lib/url";

const fallbackWhatsappUrl = whatsappLinkWithMessage(
  contactLinks.whatsapp,
  "Halo DEBRODER, saya ingin bertanya tentang layanan DEBRODER."
);

const fallbackPromo: PublicShellPromoViewModel = {
  message: "Konsultasi desain gratis untuk kebutuhan apparel custom",
  actionLabel: "Hubungi WhatsApp",
  actionHref: fallbackWhatsappUrl
};

export function SiteHeader({
  positionMode = "sticky",
  expandedAtTop = false,
  navigationFacets,
  preserveJerseyOutput = false,
  whatsappHref = fallbackWhatsappUrl,
  promo = fallbackPromo
}: {
  positionMode?: "sticky" | "natural";
  expandedAtTop?: boolean;
  navigationFacets?: PublicNavigationFacets;
  preserveJerseyOutput?: boolean;
  whatsappHref?: string;
  promo?: PublicShellPromoViewModel;
}) {
  return (
    <SiteHeaderClient
      positionMode={positionMode}
      expandedAtTop={expandedAtTop}
      navigationFacets={navigationFacets}
      preserveJerseyOutput={preserveJerseyOutput}
      whatsappHref={whatsappHref}
      promo={promo}
    />
  );
}
