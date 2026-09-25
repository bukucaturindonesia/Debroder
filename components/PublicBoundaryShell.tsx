"use client";

import type { CSSProperties, ReactNode } from "react";
import { MobileBottomNav } from "@/components/mobile/MobileBottomNav";
import { PublicFooter } from "@/components/PublicFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { StorefrontCartBoundary } from "@/components/storefront/StorefrontCartBoundary";
import { buildLoadingPublicShellPageModel } from "@/lib/public-shell/domain";
import { getPublicTheme, publicThemeCssVariables } from "@/lib/public-theme/registry";

const boundaryShellModel = buildLoadingPublicShellPageModel();
const boundaryTheme = getPublicTheme(undefined);
const boundaryThemeStyle = publicThemeCssVariables(boundaryTheme) as CSSProperties;

export function PublicBoundaryShell({ children }: { children: ReactNode }) {
  return (
    <StorefrontCartBoundary>
      <main
        data-ui-system="canonical"
        data-public-theme={boundaryTheme.id}
        data-theme-nav-treatment={boundaryTheme.tokens.navTreatment}
        data-theme-button-treatment={boundaryTheme.tokens.buttonTreatment}
        data-theme-card-treatment={boundaryTheme.tokens.cardTreatment}
        data-theme-footer-treatment={boundaryTheme.tokens.footerTreatment}
        data-theme-campaign-treatment={boundaryTheme.tokens.campaignTreatment}
        data-theme-pdp-density={boundaryTheme.tokens.pdpDensity}
        style={boundaryThemeStyle}
        className="public-site debroder-storefront min-h-screen bg-brand-offWhite text-brand-charcoal"
      >
        <SiteHeader navigationFacets={boundaryShellModel.data.header.navigationFacets} />
        {children}
        <PublicFooter model={boundaryShellModel.data.footer} />
        <MobileBottomNav />
      </main>
    </StorefrontCartBoundary>
  );
}
