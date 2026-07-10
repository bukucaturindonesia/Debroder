import Link from "next/link";
import type { ReactNode } from "react";
import { BrandIcon } from "@/components/BrandIcon";
import type { PublicContent } from "@/lib/types";
import { emailHref, facebookHref, instagramHref, whatsappLinkWithMessage } from "@/lib/url";

const shopLinks = [
  { label: "Kaos Polos", href: "/kaos-polos" },
  { label: "Jaket & Hoodie", href: "/jaket-hoodie" },
  { label: "Jersey", href: "/jersey" },
  { label: "Headwear", href: "/headwear" },
  { label: "Sablon DTF", href: "/sablon-dtf" },
  { label: "Cetak Sublim", href: "/cetak-sublim" }
];

const helpLinks = [
  { label: "Cara Order", href: "/cara-order" },
  { label: "Keranjang", href: "/keranjang" },
  { label: "Store", href: "/store" },
  { label: "Koleksi", href: "/koleksi" }
];

function FooterLinks({ children }: { children: ReactNode }) {
  return <div className="mt-5 grid gap-4 text-[15px] text-black/58">{children}</div>;
}

function DesktopColumn({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="text-[15px] font-semibold text-[#111]">{title}</h3>
      <FooterLinks>{children}</FooterLinks>
    </div>
  );
}

function MobileAccordion({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="group border-b border-black/10">
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

export function PublicFooter({ content }: { content: PublicContent }) {
  const emailLink = emailHref(content.contact.email);
  const facebookLink = facebookHref(content.contact.facebook);
  const instagramLink = instagramHref(content.contact.instagram);
  const whatsappLink = whatsappLinkWithMessage(
    content.contact.whatsapp_link || content.contact.whatsapp_utama,
    "Halo DEBRODER, saya ingin bertanya tentang layanan DEBRODER."
  );

  const companyLinks = [
    { label: "Tentang DEBRODER", href: "/#tentang" },
    ...content.stores.slice(0, 4).map((store) => ({ label: store.nama_store.replace(/^STORE\s+/i, "Store "), href: "/store" })),
    { label: "Hubungi Kami", href: emailLink }
  ];

  const socialItems = [
    { label: "Instagram", href: instagramLink, icon: "instagram" as const },
    { label: "WhatsApp", href: whatsappLink, icon: "whatsapp" as const },
    { label: "Facebook", href: facebookLink, icon: "facebook" as const },
    { label: "Email", href: emailLink, icon: "email" as const }
  ].filter((item) => Boolean(item.href));

  return (
    <footer className="border-t border-black/10 bg-white text-[#111]">
      <div className="section-shell py-14 sm:py-16 lg:py-20">
        <div className="hidden grid-cols-[1fr_1fr_1.2fr_.7fr] gap-12 md:grid lg:gap-20">
          <DesktopColumn title="Belanja">
            {shopLinks.map((item) => <Link key={item.href} href={item.href} className="transition hover:text-[#111]">{item.label}</Link>)}
          </DesktopColumn>

          <DesktopColumn title="Bantuan">
            {helpLinks.map((item) => <Link key={item.href} href={item.href} className="transition hover:text-[#111]">{item.label}</Link>)}
          </DesktopColumn>

          <DesktopColumn title="DEBRODER">
            {companyLinks.map((item) => item.href.startsWith("mailto:") ? (
              <a key={`${item.label}-${item.href}`} href={item.href} className="transition hover:text-[#111]">{item.label}</a>
            ) : (
              <Link key={`${item.label}-${item.href}`} href={item.href} className="transition hover:text-[#111]">{item.label}</Link>
            ))}
          </DesktopColumn>

          <div className="md:text-right">
            <p className="inline-flex items-center gap-2 text-[15px] text-black/58">
              <span aria-hidden="true">◎</span>
              Indonesia
            </p>
          </div>
        </div>

        <div className="md:hidden">
          <MobileAccordion title="Belanja">
            {shopLinks.map((item) => <Link key={item.href} href={item.href} className="transition hover:text-[#111]">{item.label}</Link>)}
          </MobileAccordion>
          <MobileAccordion title="Bantuan">
            {helpLinks.map((item) => <Link key={item.href} href={item.href} className="transition hover:text-[#111]">{item.label}</Link>)}
          </MobileAccordion>
          <MobileAccordion title="DEBRODER">
            {companyLinks.map((item) => item.href.startsWith("mailto:") ? (
              <a key={`${item.label}-${item.href}`} href={item.href} className="transition hover:text-[#111]">{item.label}</a>
            ) : (
              <Link key={`${item.label}-${item.href}`} href={item.href} className="transition hover:text-[#111]">{item.label}</Link>
            ))}
          </MobileAccordion>
          <p className="mt-6 inline-flex items-center gap-2 text-[15px] text-black/58"><span aria-hidden="true">◎</span>Indonesia</p>
        </div>

        <div className="mt-14 flex flex-col gap-6 border-t border-black/10 pt-6 text-sm text-black/55 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-x-6 gap-y-3">
            <p>{content.contact.copyright_text || "© 2026 DEBRODER. All rights reserved."}</p>
            <Link href="/cara-order" className="transition hover:text-[#111]">Syarat & Ketentuan</Link>
            <Link href="/cara-order" className="transition hover:text-[#111]">Kebijakan Privasi</Link>
          </div>

          <div className="flex items-center gap-2">
            {socialItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                target={item.href.startsWith("http") ? "_blank" : undefined}
                rel={item.href.startsWith("http") ? "noopener noreferrer" : undefined}
                aria-label={item.label}
                className="grid h-10 w-10 place-items-center rounded-full transition hover:bg-[#f5f5f5]"
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
