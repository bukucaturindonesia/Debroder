import Link from "next/link";
import type { ReactNode } from "react";
import { BrandIcon } from "@/components/BrandIcon";
import { Logo } from "@/components/Logo";
import type { PageLinkViewModel } from "@/lib/contracts/page-view-model";
import type { PublicShellFooterViewModel } from "@/lib/public-shell/model";

type FooterTone = "dark" | "light";

function FooterLinks({ children }: { children: ReactNode }) {
  return <div className="public-footer-links public-footer-secondary mt-5 grid gap-3.5 text-sm">{children}</div>;
}

function DesktopColumn({ title, children, tone }: { title: string; children: ReactNode; tone: FooterTone }) {
  return (
    <div className="public-footer-column">
      <h3 className={`text-[15px] font-semibold ${tone === "light" ? "text-[#111]" : "text-white"}`}>{title}</h3>
      <FooterLinks>{children}</FooterLinks>
    </div>
  );
}

function MobileAccordion({ title, children, tone }: { title: string; children: ReactNode; tone: FooterTone }) {
  return (
    <details className={`public-footer-accordion group border-b ${tone === "light" ? "border-[#e5e5e5]" : "border-white/15"}`}>
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between text-[15px] font-semibold marker:hidden">
        {title}
        <span className="text-xl font-normal transition group-open:rotate-45" aria-hidden="true">+</span>
      </summary>
      <div className="pb-6">
        <FooterLinks>{children}</FooterLinks>
      </div>
    </details>
  );
}

function FooterBrand({ description, tone }: { description: string; tone: FooterTone }) {
  return (
    <div className="public-footer-brand min-w-0">
      <div className="public-footer-logo inline-flex max-w-[200px] items-center">
        <Logo variant={tone === "light" ? "primary-black" : "primary-white"} size="md" />
      </div>
      <p className="public-footer-secondary mt-4 max-w-[19rem] text-sm leading-6">
        {description}
      </p>
    </div>
  );
}

function FooterLink({ item, tone }: { item: PageLinkViewModel; tone: FooterTone }) {
  const className = `transition-colors underline-offset-4 focus-visible:underline ${tone === "light" ? "hover:text-[#111] focus-visible:text-[#111]" : "hover:text-white focus-visible:text-white"}`;
  if (item.href.startsWith("mailto:")) {
    return <a href={item.href} className={className}>{item.label}</a>;
  }
  return <Link href={item.href} className={className}>{item.label}</Link>;
}

export function PublicFooter({ model, tone = "dark" }: { model: PublicShellFooterViewModel; tone?: FooterTone }) {
  const light = tone === "light";
  const legalLinkClass = `transition-colors focus-visible:underline ${light ? "hover:text-[#111] focus-visible:text-[#111]" : "hover:text-white focus-visible:text-white"}`;

  return (
    <footer
      data-public-footer
      data-footer-tone={tone}
      className={`public-footer-system-v1 ${light ? "public-footer-light bg-white text-[#111]" : "public-footer-dark bg-black text-white"}`}
    >
      <div className="section-shell py-14 sm:py-16 lg:py-20">
        <div className="public-footer-grid hidden grid-cols-[1fr_1fr_1.2fr_.7fr] gap-12 md:grid lg:gap-20">
          <FooterBrand description={model.brandDescription} tone={tone} />

          <DesktopColumn title="Belanja" tone={tone}>
            {model.publicShopLinks.map((item) => <FooterLink key={item.href} item={item} tone={tone} />)}
          </DesktopColumn>

          <DesktopColumn title="Bantuan" tone={tone}>
            {model.helpLinks.map((item) => <FooterLink key={item.href} item={item} tone={tone} />)}
          </DesktopColumn>

          <DesktopColumn title="Tentang" tone={tone}>
            {model.companyLinks.map((item) => <FooterLink key={`${item.label}-${item.href}`} item={item} tone={tone} />)}
          </DesktopColumn>
        </div>

        <div className="md:hidden">
          <div className="mb-8">
            <FooterBrand description={model.brandDescription} tone={tone} />
          </div>
          <MobileAccordion title="Belanja" tone={tone}>
            {model.publicShopLinks.map((item) => <FooterLink key={item.href} item={item} tone={tone} />)}
          </MobileAccordion>
          <MobileAccordion title="Bantuan" tone={tone}>
            {model.helpLinks.map((item) => <FooterLink key={item.href} item={item} tone={tone} />)}
          </MobileAccordion>
          <MobileAccordion title="Tentang" tone={tone}>
            {model.companyLinks.map((item) => <FooterLink key={`${item.label}-${item.href}`} item={item} tone={tone} />)}
          </MobileAccordion>
        </div>

        <div className="public-footer-muted mt-16 flex flex-col gap-6 text-sm lg:mt-20 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-x-6 gap-y-3">
            <p>{model.copyrightText}</p>
            <Link href={model.termsLink.href} className={legalLinkClass}>{model.termsLink.label}</Link>
            <Link href={model.privacyLink.href} className={legalLinkClass}>{model.privacyLink.label}</Link>
          </div>

          <div className="flex items-center gap-2">
            {model.socialLinks.map((item) => (
              <a
                key={item.label}
                href={item.href}
                target={item.external ? "_blank" : undefined}
                rel={item.external ? "noopener noreferrer" : undefined}
                aria-label={item.label}
                className={`grid h-12 w-12 place-items-center rounded-full border transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${light ? "border-[#e5e5e5] hover:border-[#111] hover:bg-[#f5f5f5] focus-visible:outline-[#063d24]" : "border-transparent hover:bg-white/10 focus-visible:outline-white"}`}
              >
                {item.icon ? (
                  <BrandIcon name={item.icon} className="h-4 w-4" tone={light ? "dark" : "light"} />
                ) : (
                  <span aria-hidden="true" className={`text-sm font-bold ${light ? "text-[#111]" : "text-white"}`}>f</span>
                )}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
