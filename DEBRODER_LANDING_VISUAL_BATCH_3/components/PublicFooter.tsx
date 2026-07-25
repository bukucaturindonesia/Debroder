import Link from "next/link";
import type { ReactNode } from "react";
import { BrandIcon } from "@/components/BrandIcon";
import { Logo } from "@/components/Logo";
import type { PageLinkViewModel } from "@/lib/contracts/page-view-model";
import type { PublicShellFooterViewModel } from "@/lib/public-shell/model";

type FooterVariant = "default" | "dark" | "public-dark";

function FooterLinks({ children, dark, publicDark }: { children: ReactNode; dark: boolean; publicDark: boolean }) {
  return <div className={`public-footer-links mt-5 grid gap-3.5 text-sm ${publicDark ? "public-footer-secondary" : dark ? "text-white/58" : "text-black/58"}`}>{children}</div>;
}

function DesktopColumn({ title, children, dark, publicDark }: { title: string; children: ReactNode; dark: boolean; publicDark: boolean }) {
  return (
    <div className="public-footer-column">
      <h3 className={`text-sm font-semibold ${dark ? "text-white" : "text-[#111]"}`}>{title}</h3>
      <FooterLinks dark={dark} publicDark={publicDark}>{children}</FooterLinks>
    </div>
  );
}

function MobileAccordion({ title, children, dark, publicDark }: { title: string; children: ReactNode; dark: boolean; publicDark: boolean }) {
  return (
    <details className={`public-footer-accordion group border-b ${dark ? "border-white/15" : "border-black/10"}`}>
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between text-[15px] font-semibold marker:hidden">
        {title}
        <span className="text-xl font-normal transition group-open:rotate-45" aria-hidden="true">+</span>
      </summary>
      <div className="pb-6">
        <FooterLinks dark={dark} publicDark={publicDark}>{children}</FooterLinks>
      </div>
    </details>
  );
}

function FooterBrand({ dark, publicDark, description }: { dark: boolean; publicDark: boolean; description: string }) {
  return (
    <div className="public-footer-brand min-w-0">
      <div className="inline-flex max-w-[200px] items-center">
        <Logo variant={dark ? "primary-white" : "primary-dark"} size="md" />
      </div>
      <p className={`mt-5 max-w-[19rem] text-sm leading-6 ${publicDark ? "public-footer-secondary" : dark ? "text-white/58" : "text-black/58"}`}>
        {description}
      </p>
    </div>
  );
}

function FooterLink({ item, dark }: { item: PageLinkViewModel; dark: boolean }) {
  const className = `transition underline-offset-4 ${dark ? "hover:text-white" : "hover:text-[#111]"}`;
  if (item.href.startsWith("mailto:")) {
    return <a href={item.href} className={className}>{item.label}</a>;
  }
  return <Link href={item.href} className={className}>{item.label}</Link>;
}

export function PublicFooter({ model, variant = "default" }: { model: PublicShellFooterViewModel; variant?: FooterVariant }) {
  const publicDark = variant === "public-dark";
  const dark = variant === "dark" || publicDark;
  const currentShopLinks = publicDark ? model.publicShopLinks : model.shopLinks;

  return (
    <footer className={`public-footer-system-v1 ${publicDark ? "public-footer-dark bg-black text-white" : dark ? "bg-[#050505] text-white" : "border-t border-black/10 bg-white text-[#111]"}`}>
      <div className="section-shell py-14 sm:py-16 lg:py-20">
        <div className="public-footer-grid hidden grid-cols-[1fr_1fr_1.2fr_.7fr] gap-12 md:grid lg:gap-20">
          <FooterBrand dark={dark} publicDark={publicDark} description={model.brandDescription} />

          <DesktopColumn title="Belanja" dark={dark} publicDark={publicDark}>
            {currentShopLinks.map((item) => <FooterLink key={item.href} item={item} dark={dark} />)}
          </DesktopColumn>

          <DesktopColumn title="Bantuan" dark={dark} publicDark={publicDark}>
            {model.helpLinks.map((item) => <FooterLink key={item.href} item={item} dark={dark} />)}
          </DesktopColumn>

          <DesktopColumn title="DEBRODER" dark={dark} publicDark={publicDark}>
            {model.companyLinks.map((item) => <FooterLink key={`${item.label}-${item.href}`} item={item} dark={dark} />)}
          </DesktopColumn>
        </div>

        <div className="public-footer-mobile md:hidden">
          <div className="mb-8">
            <FooterBrand dark={dark} publicDark={publicDark} description={model.brandDescription} />
          </div>
          <MobileAccordion title="Belanja" dark={dark} publicDark={publicDark}>
            {currentShopLinks.map((item) => <FooterLink key={item.href} item={item} dark={dark} />)}
          </MobileAccordion>
          <MobileAccordion title="Bantuan" dark={dark} publicDark={publicDark}>
            {model.helpLinks.map((item) => <FooterLink key={item.href} item={item} dark={dark} />)}
          </MobileAccordion>
          <MobileAccordion title="DEBRODER" dark={dark} publicDark={publicDark}>
            {model.companyLinks.map((item) => <FooterLink key={`${item.label}-${item.href}`} item={item} dark={dark} />)}
          </MobileAccordion>
        </div>

        <div className={`public-footer-bottom mt-14 flex flex-col gap-6 border-t pt-6 text-sm lg:mt-16 lg:flex-row lg:items-center lg:justify-between ${dark ? "border-white/15" : "border-black/10"} ${publicDark ? "public-footer-muted" : dark ? "text-white/55" : "text-black/55"}`}>
          <div className="flex flex-wrap gap-x-6 gap-y-3">
            <p>{model.copyrightText}</p>
            <Link href={model.termsLink.href} className={`transition ${dark ? "hover:text-white" : "hover:text-[#111]"}`}>{model.termsLink.label}</Link>
            <Link href={model.privacyLink.href} className={`transition ${dark ? "hover:text-white" : "hover:text-[#111]"}`}>{model.privacyLink.label}</Link>
          </div>

          <div className="flex items-center gap-2">
            {model.socialLinks.map((item) => (
              <a
                key={item.label}
                href={item.href}
                target={item.external ? "_blank" : undefined}
                rel={item.external ? "noopener noreferrer" : undefined}
                aria-label={item.label}
                className={`grid h-11 w-11 place-items-center rounded-full transition ${dark ? "hover:bg-white/10" : "bg-[#f5f5f5] hover:bg-[#e5e5e5]"}`}
              >
                <BrandIcon name={item.icon} className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
