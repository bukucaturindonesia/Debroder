import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHero, PublicShell } from "@/components/PublicPage";
import { SafeImage } from "@/components/SafeImage";
import { fallbackCategories, fallbackImages } from "@/lib/fallback-data";
import { getPublicContent } from "@/lib/public-data";
import { whatsappHref } from "@/lib/url";

function slugify(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function OptionList({ title, items }: { title: string; items?: string[] }) {
  if (!items?.length) return null;
  return <div><h3 className="font-semibold">{title}</h3><div className="mt-3 flex flex-wrap gap-2">{items.map((item) => <span key={item} className="rounded-full border border-brand-softGray px-4 py-2 text-sm font-medium">{item}</span>)}</div></div>;
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

  const orderUrl = whatsappHref(content.contact.whatsapp_apparel, `Halo DE BRODER, saya ingin bertanya tentang ${category.nama_kategori}.`);
  const gallery = Array.from(new Set([category.gambar_url, ...(category.gallery_urls || [])].filter(Boolean)));

  return (
    <PublicShell content={content}>
      <PageHero
        label="CUSTOM JERSEY"
        title={category.nama_kategori}
        description={category.deskripsi}
        imageUrl={category.gambar_url}
        objectPosition={category.object_position}
        objectFit={category.object_fit}
        imageZoom={category.focal_zoom}
        ctaText="Konsultasi Jersey"
        ctaHref={orderUrl}
        secondaryCtaText="Kembali ke Katalog"
        secondaryCtaHref="/jersey"
        breadcrumbs={[{ label: "Beranda", href: "/" }, { label: "Jersey", href: "/jersey" }, { label: category.nama_kategori }]}
      />
      <section data-reveal className="bg-brand-offWhite py-10 sm:py-12">
        <div className="section-shell">
          <div className={`grid gap-4 ${gallery.length > 1 ? "sm:grid-cols-2 lg:grid-cols-3" : "max-w-3xl"}`}>
            {gallery.map((image, index) => <SafeImage key={`${image}-${index}`} src={image} fallbackSrc={fallbackImages.product} alt={`${category.image_alt || category.nama_kategori} ${index + 1}`} className="product-image-frame aspect-[4/5] w-full" objectFit={category.object_fit || "cover"} objectPosition={category.object_position || "center center"} focalX={category.focal_x} focalY={category.focal_y} zoom={category.focal_zoom} sizes="(min-width: 1024px) 33vw, 100vw" />)}
          </div>
          <div className="mt-6 grid gap-6 p-0 sm:p-0 lg:grid-cols-2">
            <div><h2 className="text-2xl font-semibold">Pilihan custom</h2><p className="mt-3 text-sm leading-7 text-brand-charcoal/65">Warna, bahan, kerah, lengan, nama, dan nomor dapat disesuaikan dengan kebutuhan tim.</p></div>
            <div className="grid gap-6"><OptionList title="Warna" items={category.color_options} /><OptionList title="Kerah" items={category.collar_options} /><OptionList title="Lengan" items={category.sleeve_options} /><OptionList title="Bahan" items={category.material_options} /><OptionList title="Size chart" items={category.size_chart} /></div>
          </div>
          {category.faq_items?.length ? <div className="mt-8"><h2 className="text-2xl font-semibold">Pertanyaan umum</h2><div className="mt-4 grid gap-3">{category.faq_items.map((item) => <p key={item} className="p-0 text-sm leading-6 text-brand-charcoal/70">{item}</p>)}</div></div> : null}
        </div>
      </section>
    </PublicShell>
  );
}
