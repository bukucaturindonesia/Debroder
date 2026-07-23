import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { BrandIcon } from "@/components/BrandIcon";
import type { PageLinkViewModel } from "@/lib/contracts/page-view-model";
import type { PublicShellFooterViewModel } from "@/lib/public-shell/model";

type FooterVariant = "default" | "dark" | "public-dark";

function FooterLinks({ children, dark, publicDark }: { children: ReactNode; dark: boolean; publicDark: boolean }) {
  return <div className={`mt-5 grid gap-4 text-[15px] ${publicDark ? "public-footer-secondary" : dark ? "text-white/58" : "text-black/58"}`}>{children}</div>;
}

function DesktopColumn({ title, children, dark, publicDark }: { title: string; children: ReactNode; dark: boolean; publicDark: boolean }) {
  return (
    <div>
      <h3 className={`text-[15px] font-semibold ${dark ? "text-white" : "text-[#111]"}`}>{title}</h3>
      <FooterLinks dark={dark} publicDark={publicDark}>{children}</FooterLinks>
    </div>
  );
}

function MobileAccordion({ title, children, dark, publicDark }: { title: string; children: ReactNode; dark: boolean; publicDark: boolean }) {
  return (
    <details className={`group ${dark ? "" : "border-b border-black/10"}`}>
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
    <div className="min-w-0">
      <div className={`w-full max-w-36 md:max-w-40 lg:max-w-44 ${dark ? "" : "bg-[#111] p-2.5"}`}>
        <Image
          src="/brand/debroder/logo-debroder-white.png"
          alt="DEBRODER"
          width={2048}
          height={2020}
          className="h-auto w-full object-contain"
          sizes="(min-width: 1024px) 176px, (min-width: 768px) 160px, 144px"
        />
      </div>
      <p className={`mt-4 max-w-[19rem] text-sm leading-6 ${publicDark ? "public-footer-secondary" : dark ? "text-white/58" : "text-black/58"}`}>
        {description}
      </p>
    </div>
  );
}

function FooterLink({ item, dark }: { item: PageLinkViewModel; dark: boolean }) {
  if (item.href.startsWith("mailto:")) {
    return <a href={item.href} className={`transition ${dark ? "hover:text-white" : "hover:text-[#111]"}`}>{item.label}</a>;
  }
  return <Link href={item.href} className={`transition ${dark ? "hover:text-white" : "hover:text-[#111]"}`}>{item.label}</Link>;
}

export function PublicFooter({ model, variant = "default" }: { model: PublicShellFooterViewModel; variant?: FooterVariant }) {
  const publicDark = variant === "public-dark";
  const dark = variant === "dark" || publicDark;
  const currentShopLinks = publicDark ? model.publicShopLinks : model.shopLinks;

  return (
    <footer className={publicDark ? "public-footer-dark bg-black text-white" : dark ? "bg-[#050505] text-white" : "border-t border-black/10 bg-white text-[#111]"}>
      <div className="section-shell py-14 sm:py-16 lg:py-20">
        <div className="hidden grid-cols-[1fr_1fr_1.2fr_.7fr] gap-12 md:grid lg:gap-20">
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

        <div className="md:hidden">
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

        <div className={`mt-16 flex flex-col gap-6 text-sm lg:mt-20 lg:flex-row lg:items-center lg:justify-between ${publicDark ? "public-footer-muted" : dark ? "text-white/55" : "text-black/55"}`}>
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
                className={`grid h-10 w-10 place-items-center rounded-full transition ${dark ? "hover:bg-white/10" : "hover:bg-[#f5f5f5]"}`}
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
