import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/Logo";
import type { PublicContent } from "@/lib/types";
import { emailHref, facebookHref, instagramHref, whatsappLinkWithMessage } from "@/lib/url";

const serviceLinks = [
  { label: "Kaos Polos", href: "/kaos-polos" },
  { label: "Sablon DTF", href: "/sablon-dtf" },
  { label: "Custom Jersey", href: "/jersey" },
  { label: "Maklon DTF", href: "/maklon-dtf" },
  { label: "Cetak Sublim", href: "/cetak-sublim" }
];

function FooterColumn({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="text-base font-semibold text-white/82">{title}</h3>
      <div className="mt-3 grid gap-2 text-base font-normal text-white/62">{children}</div>
    </div>
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

  return (
    <footer className="snap-section bg-[#050706] py-10 text-white sm:py-12">
      <div className="section-shell grid gap-8 sm:grid-cols-2 lg:grid-cols-[1.35fr_1fr_1fr_1fr] lg:gap-10">
        <div>
          <Logo variant="primary-white" size="lg" />
          <p className="mt-4 max-w-sm text-sm leading-6 text-white/55">Apparel, sablon DTF, dan jersey custom dengan standar produksi yang konsisten sejak 2016.</p>
        </div>

        <FooterColumn title="Layanan">
          {serviceLinks.map((item) => <Link key={item.href} href={item.href} className="transition hover:text-white">{item.label}</Link>)}
        </FooterColumn>

        <FooterColumn title="Store">
          {content.stores.slice(0, 4).map((store) => (
            <Link key={store.nama_store} href="/store" className="transition hover:text-white">{store.nama_store.replace(/^STORE\s+/i, "")}</Link>
          ))}
        </FooterColumn>

        <FooterColumn title="Kontak & Sosial">
          <a href={emailLink} className="transition hover:text-white">Email</a>
          <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="transition hover:text-white">WhatsApp</a>
          <a href={instagramLink} target="_blank" rel="noopener noreferrer" className="transition hover:text-white">Instagram</a>
          <a href={facebookLink} target="_blank" rel="noopener noreferrer" className="transition hover:text-white">Facebook</a>
        </FooterColumn>
      </div>

      <div className="section-shell mt-8 flex flex-col gap-3 border-t border-white/10 pt-5 text-sm text-white/42 sm:flex-row sm:items-center sm:justify-between">
        <p>{content.contact.copyright_text || "© 2026 DEBRODER. All rights reserved."}</p>
        <div className="flex gap-5">
          <Link href="/cara-order" className="transition hover:text-white">Cara Order</Link>
          <Link href="/admin/login" className="transition hover:text-white">Admin</Link>
        </div>
      </div>
    </footer>
  );
}
