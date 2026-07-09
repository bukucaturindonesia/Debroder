import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JerseyConfigurator } from "@/components/JerseyConfigurator";
import { PageHero, PublicShell } from "@/components/PublicPage";
import { SafeImage } from "@/components/SafeImage";
import { fallbackCategories, fallbackImages } from "@/lib/fallback-data";
import { getPublicContent } from "@/lib/public-data";
import { whatsappHref } from "@/lib/url";

function slugify(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const [{ slug }, content] = await Promise.all([params, getPublicContent()]);
  const category = content.categories.find((item) => (item.slug || slugify(item.nama_kategori)) === slug);
  if (!category) return { title: "Kategori tidak ditemukan | DE BRODER" };
  const title = category.seo_title || `${category.nama_kategori} | DE BRODER`;
  const description = category.seo_description || category.deskripsi;
  return {
    title,
    description,
    alternates: { canonical: category.canonical_url || `/jersey/${slug}` },
    openGraph: { title, description, images: [{ url: category.og_image_url || category.gambar_url, alt: category.image_alt || category.nama_kategori }] }
  };
}

export default async function JerseyDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const [{ slug }, content] = await Promise.all([params, getPublicContent()]);
  const category = content.categories.find((item) => (item.slug || slugify(item.nama_kategori)) === slug && (item.category_key === "jersey" || `${item.link_slug} ${item.nama_kategori}`.toLowerCase().includes("jersey")))
    || fallbackCategories.find((item) => (item.slug || slugify(item.nama_kategori)) === slug && item.category_key === "jersey");
  if (!category) notFound();
  const jerseyCategory = category!;

  const orderUrl = whatsappHref(content.contact.whatsapp_apparel, `Halo DE BRODER, saya ingin bertanya tentang ${jerseyCategory.nama_kategori}.`);
  const gallery = Array.from(new Set([jerseyCategory.gambar_url, ...(jerseyCategory.gallery_urls || [])].filter(Boolean)));

  return (
    <PublicShell content={content}>
      <PageHero
        label="CUSTOM JERSEY"
        title={jerseyCategory.nama_kategori}
        description={jerseyCategory.deskripsi}
        imageUrl={jerseyCategory.gambar_url}
        objectPosition={jerseyCategory.object_position}
        objectFit={jerseyCategory.object_fit}
        imageZoom={jerseyCategory.focal_zoom}
        ctaText="Konsultasi Jersey"
        ctaHref={orderUrl}
        secondaryCtaText="Kembali ke Katalog"
        secondaryCtaHref="/jersey"
        breadcrumbs={[{ label: "Beranda", href: "/" }, { label: "Jersey", href: "/jersey" }, { label: jerseyCategory.nama_kategori }]}
      />

      <section data-reveal className="bg-brand-offWhite pt-8 sm:pt-10">
        <div className="section-shell">
          <div className={`grid gap-4 ${gallery.length > 1 ? "sm:grid-cols-2 lg:grid-cols-3" : "max-w-3xl"}`}>
            {gallery.map((image, index) => (
              <SafeImage
                key={`${image}-${index}`}
                src={image}
                fallbackSrc={fallbackImages.product}
                alt={`${jerseyCategory.image_alt || jerseyCategory.nama_kategori} ${index + 1}`}
                className="product-image-frame aspect-[4/5] w-full"
                objectFit={jerseyCategory.object_fit || "cover"}
                objectPosition={jerseyCategory.object_position || "center center"}
                focalX={jerseyCategory.focal_x}
                focalY={jerseyCategory.focal_y}
                zoom={jerseyCategory.focal_zoom}
                sizes="(min-width: 1024px) 33vw, 100vw"
              />
            ))}
          </div>
        </div>
      </section>

      <JerseyConfigurator
        config={content.jerseyConfigurator}
        jerseyName={jerseyCategory.nama_kategori}
        jerseySlug={slug}
        imageUrl={jerseyCategory.gambar_url}
        imageAlt={jerseyCategory.image_alt || jerseyCategory.nama_kategori}
      />

      {jerseyCategory.faq_items?.length ? (
        <section data-reveal className="bg-brand-offWhite pb-12 sm:pb-16">
          <div className="section-shell">
            <h2 className="text-2xl font-semibold">Pertanyaan umum</h2>
            <div className="mt-4 grid gap-3">
              {jerseyCategory.faq_items.map((item) => <p key={item} className="p-0 text-sm leading-6 text-brand-charcoal/70">{item}</p>)}
            </div>
          </div>
        </section>
      ) : null}
    </PublicShell>
  );
}
