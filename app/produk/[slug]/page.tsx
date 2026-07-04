import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductGallery } from "@/components/ProductGallery";
import { ProductCatalog } from "@/components/ProductCatalog";
import { PublicShell } from "@/components/PublicPage";
import { getProductImage } from "@/lib/fallback-data";
import { getPublicContent } from "@/lib/public-data";
import { productOrderHref } from "@/lib/order";
import { formatRupiah, whatsappLinkWithMessage } from "@/lib/url";

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const [{ slug }, content] = await Promise.all([params, getPublicContent()]);
  const product = content.products.find((item) => item.slug === slug);
  if (!product) return { title: "Produk tidak ditemukan | DE BRODER" };
  const title = product.seo_title || `${product.nama} | DE BRODER`;
  const description = product.seo_description || product.short_detail || product.description || product.deskripsi;
  const image = product.og_image_url || getProductImage(product);
  return {
    title,
    description,
    alternates: { canonical: product.canonical_url || `/produk/${slug}` },
    openGraph: { title, description, images: image ? [{ url: image, alt: product.image_alt || product.nama }] : [] }
  };
}

export default async function ProductDetailPage({ params }: PageProps) {
  const [{ slug }, content] = await Promise.all([params, getPublicContent()]);
  const product = content.products.find((item) => item.slug === slug);
  if (!product) notFound();
  const images = Array.from(new Set([getProductImage(product), ...(product.gallery_urls || [])].filter(Boolean)));
  const focal = product.focal_points?.detail || product.focal_points?.catalog || {
    focal_x: Number(product.focal_x ?? 50), focal_y: Number(product.focal_y ?? 50), zoom: Number(product.focal_zoom ?? 1), target_ratio: "4:5"
  };
  const related = content.products.filter((item) => item.id !== product.id && item.kategori === product.kategori).slice(0, 5);
  const similar = content.products.filter((item) => item.id !== product.id && item.kategori !== product.kategori && (item.material_tags || []).some((tag) => (product.material_tags || []).includes(tag))).slice(0, 5);
  const whatsappUrl = whatsappLinkWithMessage(product.whatsapp_link || content.contact.whatsapp_link || "", `Halo DE BRODER, saya ingin bertanya tentang ${product.nama}.`);

  return (
    <PublicShell content={content}>
      <main className="bg-brand-offWhite py-8 sm:py-12">
        <div className="section-shell">
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-xs font-medium text-brand-charcoal/55"><Link href="/">Beranda</Link><span>/</span><Link href="/koleksi">Koleksi</Link><span>/</span><span aria-current="page">{product.nama}</span></nav>
          <div className="mt-6 grid gap-8 lg:grid-cols-2 lg:gap-12">
            <ProductGallery images={images} alt={product.image_alt || product.nama} focal={focal} />
            <div className="self-start lg:sticky lg:top-24">
              <p className="text-xs font-semibold uppercase tracking-[.18em] text-brand-charcoal/50">{product.kategori}{product.subcategory ? ` · ${product.subcategory}` : ""}</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-5xl">{product.nama}</h1>
              <div className="mt-5 flex flex-wrap items-baseline gap-3"><p className="text-2xl font-semibold">{formatRupiah(product.price ?? product.harga ?? product.base_price) || "Hubungi kami"}</p>{product.compare_price ? <p className="text-base text-brand-charcoal/45 line-through">{formatRupiah(product.compare_price)}</p> : null}</div>
              {product.short_detail ? <p className="mt-5 text-base leading-7 text-brand-charcoal/65">{product.short_detail}</p> : null}
              <div className="mt-7 flex flex-col gap-3 sm:flex-row"><Link href={productOrderHref(product)} className="inline-flex min-h-12 items-center justify-center rounded-full bg-brand-green px-7 text-sm font-semibold text-white">Pesan Sekarang</Link><a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center justify-center rounded-full border border-brand-charcoal px-7 text-sm font-semibold">Tanya via WhatsApp</a></div>
              <div className="mt-8 border-t border-brand-softGray pt-6"><h2 className="text-lg font-semibold">Deskripsi</h2><p className="mt-3 whitespace-pre-line text-sm leading-7 text-brand-charcoal/65">{product.description || product.deskripsi || "Informasi lengkap produk dapat dikonsultasikan melalui WhatsApp."}</p></div>
              {product.specifications?.length ? <div className="mt-6 border-t border-brand-softGray pt-6"><h2 className="text-lg font-semibold">Spesifikasi</h2><dl className="mt-3 divide-y divide-brand-softGray">{product.specifications.map((item) => { const [key, ...rest] = item.split(":"); return <div key={item} className="grid grid-cols-[120px_1fr] gap-3 py-3 text-sm"><dt className="font-semibold">{rest.length ? key : "Detail"}</dt><dd className="text-brand-charcoal/65">{rest.length ? rest.join(":").trim() : item}</dd></div>; })}</dl></div> : null}
            </div>
          </div>
        </div>
      </main>
      {related.length ? <section className="bg-white py-14 sm:py-20"><div className="section-shell"><ProductCatalog products={related} title="Produk terkait" showHeading /></div></section> : null}
      {similar.length ? <section className="bg-brand-offWhite py-14 sm:py-20"><div className="section-shell"><ProductCatalog products={similar} title="Produk serupa" showHeading /></div></section> : null}
    </PublicShell>
  );
}
