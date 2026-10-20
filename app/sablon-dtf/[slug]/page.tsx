import { notFound } from "next/navigation";
import Link from "next/link";
import { PageHero, PublicShell } from "@/components/PublicPage";
import { fallbackImages, fallbackServices, productImageFallbacks } from "@/lib/fallback-data";
import { getPublicContent } from "@/lib/public-data";
import { whatsappHref } from "@/lib/url";

export default async function SablonDtfDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const [{ slug }, content] = await Promise.all([params, getPublicContent()]);
  const service = content.services.find((item) => item.slug === slug && (item.category_key === "sablon-dtf" || `${item.nama} ${item.slug}`.toLowerCase().includes("sablon dtf")))
    || fallbackServices.find((item) => item.slug === slug && item.category_key === "sablon-dtf");
  if (!service) notFound();

  const orderUrl = whatsappHref(content.contact.whatsapp_apparel, `Halo DE BRODER, saya ingin bertanya tentang ${service.nama}.`);
  const serviceImage = service.image_url?.trim();
  const hasCampaignImage = Boolean(serviceImage
    && serviceImage !== fallbackImages.pageHero
    && serviceImage !== productImageFallbacks["Sablon DTF Custom"]);

  return (
    <PublicShell>
      <div className={`dtf-order-detail-hero ${hasCampaignImage ? "" : "dtf-order-detail-hero--fallback"}`}>
      <PageHero
        label="SABLON DTF"
        title={service.nama}
        description={service.deskripsi}
        imageUrl={service.image_url}
        objectPosition={service.object_position}
        objectFit={service.object_fit}
        imageZoom={service.focal_zoom}
        ctaText="Konsultasi via WhatsApp"
        ctaHref={orderUrl}
        secondaryCtaText="Kembali ke Katalog"
        secondaryCtaHref="/sablon-dtf"
        breadcrumbs={[{ label: "Beranda", href: "/" }, { label: "Sablon DTF", href: "/sablon-dtf" }, { label: service.nama }]}
      />
      </div>
      <section data-reveal className="bg-brand-offWhite py-10 sm:py-12">
        <div className="section-shell grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <div className="min-w-0">
            <h2 className="text-2xl font-semibold">Detail layanan</h2>
            <p className="mt-4 whitespace-pre-line text-sm leading-7 text-brand-charcoal/70">{service.detail_body || service.deskripsi}</p>
            {service.available_sizes?.length ? <div className="mt-8"><h3 className="font-semibold">Pilihan ukuran</h3><div className="mt-3 flex flex-wrap gap-2">{service.available_sizes.map((size) => <span key={size} className="public-badge border border-brand-softGray">{size}</span>)}</div></div> : null}
          </div>
          <aside className="bg-brand-charcoal p-6 text-white sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">Informasi Produksi</p>
            <p className="mt-4 text-xl font-semibold leading-8">Harga pasti ditetapkan setelah ukuran, jumlah, dan kebutuhan produksi dikonfirmasi.</p>
            {service.production_estimate ? <p className="mt-4 text-sm leading-6 text-white/70">{service.production_estimate}</p> : null}
            <a href={orderUrl} target="_blank" rel="noopener noreferrer" className="public-secondary-action mt-6 w-full bg-white text-center text-brand-charcoal">Konsultasi via WhatsApp</a>
          </aside>
        </div>
        <section id="dtf-order-entry" aria-labelledby="dtf-order-title" className="section-shell mt-10 scroll-mt-28 border-y border-black/10 py-8">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)] lg:gap-12">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-black/50">Persiapan di Builder Custom</p>
              <h2 id="dtf-order-title" className="mt-2 text-2xl font-semibold">Siapkan spesifikasi dan desain</h2>
              <p className="mt-3 max-w-xl text-sm leading-7 text-black/65">Gunakan builder Custom untuk memilih produk dan layanan DTF yang tersedia. Ketersediaan layanan dan upload mengikuti pilihan produk Anda.</p>
              <Link href="/custom" className="public-button public-button--primary mt-5 w-full sm:w-auto">Buka Builder Custom</Link>
              <p className="mt-3 text-xs leading-6 text-black/55">Jika produk atau layanan belum tersedia di builder, konsultasikan kebutuhan Anda terlebih dahulu. Pesanan belum dibuat dari halaman ini.</p>
            </div>
            <ul className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-1" aria-label="Persiapan pesanan DTF">
              {[
                ["Produk dan jumlah", "Pilih produk, warna, ukuran, dan jumlah yang dibutuhkan."],
                ["Spesifikasi cetak", "Pilih layanan DTF, posisi, dan ukuran cetak yang tersedia."],
                ["Desain", "Unggah file pada bagian Desain & Layanan sesuai format yang didukung."],
                ["Review pesanan", "Periksa alokasi desain dan ringkasan, lalu validasi sebelum melanjutkan ke keranjang atau penawaran."]
              ].map(([title, description]) => (
                <li key={title} className="flex gap-3">
                  <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-charcoal" />
                  <div><h3 className="font-semibold">{title}</h3><p className="mt-1 leading-6 text-black/60">{description}</p></div>
                </li>
              ))}
            </ul>
          </div>
        </section>
        <details className="section-shell group mt-8 rounded-functional border border-black/10">
          <summary className="flex min-h-20 cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 outline-none focus-visible:ring-2 focus-visible:ring-experience-focus [&::-webkit-details-marker]:hidden">
            <span><span className="block text-xs font-semibold uppercase tracking-[0.16em] text-black/50">Tahapan Layanan & Produksi</span><span className="mt-1 block text-xl font-semibold">Cara order</span></span>
            <span aria-hidden="true" className="text-2xl transition-transform group-open:rotate-45 motion-reduce:transition-none">+</span>
          </summary>
          <div className="grid gap-5 border-t border-black/10 p-5 sm:grid-cols-2 lg:grid-cols-5">
            {content.orderSteps.map((step, index) => (
              <div key={step.id || `${step.title}-${index}`} className="p-0">
                <p className="text-xs font-semibold text-brand-charcoal/45">{String(index + 1).padStart(2, "0")}</p>
                <h3 className="mt-3 font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-brand-charcoal/60">{step.description}</p>
              </div>
            ))}
          </div>
        </details>
        {service.faq_items?.length ? <div className="section-shell mt-8"><h2 className="text-2xl font-semibold">Pertanyaan umum</h2><div className="mt-4 grid gap-3">{service.faq_items.map((item) => <p key={item} className="p-0 text-sm leading-6 text-brand-charcoal/70">{item}</p>)}</div></div> : null}
      </section>
    </PublicShell>
  );
}
