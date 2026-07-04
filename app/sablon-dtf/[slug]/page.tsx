import { notFound } from "next/navigation";
import { PageHero, PublicShell } from "@/components/PublicPage";
import { fallbackServices } from "@/lib/fallback-data";
import { getPublicContent } from "@/lib/public-data";
import { formatRupiah, whatsappHref } from "@/lib/url";

export default async function SablonDtfDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const [{ slug }, content] = await Promise.all([params, getPublicContent()]);
  const service = content.services.find((item) => item.slug === slug && (item.category_key === "sablon-dtf" || `${item.nama} ${item.slug}`.toLowerCase().includes("sablon dtf")))
    || fallbackServices.find((item) => item.slug === slug && item.category_key === "sablon-dtf");
  if (!service) notFound();

  const orderUrl = whatsappHref(content.contact.whatsapp_apparel, `Halo DE BRODER, saya ingin bertanya tentang ${service.nama}.`);

  return (
    <PublicShell content={content}>
      <PageHero
        label="SABLON DTF"
        title={service.nama}
        description={service.deskripsi}
        imageUrl={service.image_url}
        objectPosition={service.object_position}
        objectFit={service.object_fit}
        imageZoom={service.focal_zoom}
        ctaText="Pesan via WhatsApp"
        ctaHref={orderUrl}
        secondaryCtaText="Kembali ke Katalog"
        secondaryCtaHref="/sablon-dtf"
        breadcrumbs={[{ label: "Beranda", href: "/" }, { label: "Sablon DTF", href: "/sablon-dtf" }, { label: service.nama }]}
      />
      <section data-reveal className="bg-brand-offWhite py-12 sm:py-16">
        <div className="section-shell grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="bg-white p-6 sm:p-8">
            <h2 className="text-2xl font-semibold">Detail layanan</h2>
            <p className="mt-4 whitespace-pre-line text-sm leading-7 text-brand-charcoal/70">{service.detail_body || service.deskripsi}</p>
            {service.available_sizes?.length ? <div className="mt-8"><h3 className="font-semibold">Pilihan ukuran</h3><div className="mt-3 flex flex-wrap gap-2">{service.available_sizes.map((size) => <span key={size} className="rounded-full border border-brand-softGray px-4 py-2 text-sm font-medium">{size}</span>)}</div></div> : null}
          </div>
          <aside className="bg-brand-charcoal p-6 text-white sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">Informasi Produksi</p>
            {service.harga_mulai ? <p className="mt-4 text-2xl font-semibold">Mulai {formatRupiah(service.harga_mulai)}</p> : null}
            {service.production_estimate ? <p className="mt-4 text-sm leading-6 text-white/70">{service.production_estimate}</p> : null}
            <a href={orderUrl} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-white px-5 text-sm font-semibold text-brand-charcoal">Konsultasi Sekarang</a>
          </aside>
        </div>
        <div className="section-shell mt-8">
          <h2 className="text-2xl font-semibold">Cara order</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {content.orderSteps.map((step, index) => (
              <div key={step.id || `${step.title}-${index}`} className="bg-white p-5">
                <p className="text-xs font-semibold text-brand-charcoal/45">{String(index + 1).padStart(2, "0")}</p>
                <h3 className="mt-3 font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-brand-charcoal/60">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
        {service.faq_items?.length ? <div className="section-shell mt-8"><h2 className="text-2xl font-semibold">Pertanyaan umum</h2><div className="mt-4 grid gap-3">{service.faq_items.map((item) => <p key={item} className="bg-white p-5 text-sm leading-6 text-brand-charcoal/70">{item}</p>)}</div></div> : null}
      </section>
    </PublicShell>
  );
}
