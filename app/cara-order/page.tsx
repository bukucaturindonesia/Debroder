import type { Metadata } from "next";
import { OrderTimeline, PageHero, PublicShell } from "@/components/PublicPage";
import { getPublicContent } from "@/lib/public-data";
import { whatsappLinkWithMessage } from "@/lib/url";

export const metadata: Metadata = {
  title: "Cara Order di DE BRODER",
  description:
    "Ikuti langkah mudah untuk memesan kaos polos, sablon DTF, custom jersey, maklon DTF, dan cetak sublim di DE BRODER.",
  alternates: { canonical: "/cara-order" },
  openGraph: {
    title: "Cara Order di DE BRODER",
    description:
      "Langkah mudah memesan kaos polos, sablon DTF, custom jersey, maklon DTF, dan cetak sublim."
  }
};

const faqs = [
  {
    question: "Apakah bisa pesan satuan?",
    answer: "Bisa dikonsultasikan sesuai jenis layanan dan kebutuhan pesanan."
  },
  {
    question: "Apakah bisa custom desain?",
    answer: "Bisa. Kirim desain atau detail konsep saat konsultasi."
  },
  {
    question: "Apakah bisa ambil di store?",
    answer: "Bisa. Pilih store De Broder terdekat saat pesanan siap."
  },
  {
    question: "Apakah bisa dikirim?",
    answer: "Bisa. Pesanan dapat dikirim sesuai kebutuhan pelanggan."
  }
];

export default async function CaraOrderPage() {
  const content = await getPublicContent();
  const pageHero = content.pageHeroes.find(
    (hero) => hero.page_key === "cara-order"
  );
  const apparelLink = whatsappLinkWithMessage(
    content.contact.whatsapp_link || content.contact.whatsapp_apparel,
    "Halo DE BRODER, saya ingin bertanya tentang layanan DE BRODER."
  );
  const orderSteps = [...content.orderSteps]
    .filter((step) => step.status_aktif !== false)
    .sort((a, b) => a.urutan - b.urutan);

  return (
    <PublicShell content={content}>
      <PageHero
        label={pageHero?.label || "CARA ORDER"}
        title={pageHero?.title || "Cara Order di DE BRODER"}
        description={
          pageHero?.subtitle ||
          "Ikuti langkah mudah untuk memesan kaos polos, sablon DTF, custom jersey, maklon DTF, dan cetak sublim di DE BRODER."
        }
        imageUrl={pageHero?.image_url}
        mobileImageUrl={pageHero?.mobile_image_url}
        objectPosition={pageHero?.object_position}
        mobileObjectPosition={pageHero?.mobile_object_position}
        ctaText="Mulai Order"
        ctaHref={apparelLink}
        breadcrumbs={[
          { label: "Beranda", href: "/" },
          { label: "Cara Order" }
        ]}
      />
      <section className="bg-brand-offWhite py-12 sm:py-16">
        <div className="section-shell">
          <OrderTimeline steps={orderSteps} />
        </div>
      </section>
      <section className="bg-white py-12 sm:py-16">
        <div className="section-shell">
          <h2 className="text-3xl font-bold leading-[1.05] tracking-[-0.02em] sm:text-4xl">
            FAQ
          </h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {faqs.map((faq) => (
              <article
                key={faq.question}
                className="bg-brand-offWhite p-6"
              >
                <h3 className="text-lg font-semibold">{faq.question}</h3>
                <p className="mt-3 text-sm leading-6 text-brand-charcoal/70">
                  {faq.answer}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
