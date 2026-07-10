import type { Metadata } from "next";
import Link from "next/link";
import { AddToCartButton } from "@/components/CartProvider";
import { PageHero, PublicShell, ServiceCard } from "@/components/PublicPage";
import { ProductImageSwap } from "@/components/ProductImageSwap";
import { fallbackImages, getProductImage } from "@/lib/fallback-data";
import { getProductCardImages } from "@/lib/product-gallery";
import { categoryPath, collectionLimit, collectionOrder } from "@/lib/product-category-config";
import { productsForCategoryRoute } from "@/lib/product-route-matching";
import { getPublicContent } from "@/lib/public-data";
import type { Product, ProductCategory } from "@/lib/types";
import { formatRupiah } from "@/lib/url";

export const metadata: Metadata = {
  title: "Koleksi & Layanan DE BRODER",
  description:
    "Temukan layanan apparel, percetakan, custom jersey, sablon DTF, kaos polos, maklon DTF, dan cetak sublim dari DE BRODER.",
  alternates: { canonical: "/koleksi" },
  openGraph: {
    title: "Koleksi & Layanan DE BRODER",
    description:
      "Layanan apparel, percetakan, custom jersey, sablon DTF, kaos polos, maklon DTF, dan cetak sublim dari DE BRODER."
  }
};

function slugify(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function productPrice(product: Product) {
  return formatRupiah(product.price ?? product.harga ?? product.base_price ?? product.price_label) || "Hubungi kami";
}

function normalizeFilterValue(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function colorHex(value: string) {
  const key = normalizeFilterValue(value);
  const map: Record<string, string> = {
    hitam: "#111111",
    black: "#111111",
    putih: "#f7f7f7",
    white: "#f7f7f7",
    navy: "#1f2a44",
    biru: "#1d4ed8",
    blue: "#1d4ed8",
    merah: "#dc2626",
    red: "#dc2626",
    maroon: "#6f1d1b",
    kuning: "#f59e0b",
    yellow: "#f59e0b",
    mustard: "#d97706",
    abu: "#9ca3af",
    "abu-muda": "#d1d5db",
    "abu-tua": "#6b7280",
    gray: "#9ca3af",
    grey: "#9ca3af",
    cream: "#eadfca",
    beige: "#d6c4a5",
    hijau: "#166534",
    "hijau-forest": "#063d24",
    forest: "#063d24",
    "forest-green": "#063d24",
    army: "#4b5320",
    orange: "#f97316"
  };
  return map[key] || "#d1d5db";
}

function productMetaLine(product: Product) {
  const items = [
    product.color_tags?.length ? `${product.color_tags.length} Warna` : "",
    product.size_tags?.[0] || "",
    product.material_tags?.[0] || ""
  ].filter(Boolean);
  return items.slice(0, 3).join(" · ");
}

function productDetail(product: Product) {
  return product.short_detail || product.description || product.deskripsi || "";
}

function productModel(product: Product) {
  return [product.kategori, product.subcategory].filter(Boolean).join(" · ");
}

function sortProducts(products: Product[], category: ProductCategory) {
  const mode = category.collection_sort || "sort_order";
  return [...products].sort((a, b) => {
    if (mode === "newest") return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    if (mode === "best_seller") return Number(b.sales_count || 0) - Number(a.sales_count || 0);
    if (mode === "promo") return Number(Boolean(b.label_promo)) - Number(Boolean(a.label_promo));
    return a.urutan - b.urutan;
  });
}

function CollectionProductCard({ product }: { product: Product }) {
  const detailHref = `/produk/${product.slug || slugify(product.nama)}`;
  const focal = product.focal_points?.catalog;
  const cardImages = getProductCardImages(product);

  return (
    <article className="group min-w-0">
      <Link href={detailHref} className="block">
        <ProductImageSwap
          primarySrc={cardImages.primary}
          hoverSrc={cardImages.hover}
          fallbackSrc={fallbackImages.product}
          alt={product.image_alt || product.nama}
          imageClassName={(product.object_fit || "cover") === "contain" ? "object-contain p-3" : "object-cover"}
          objectFit={product.object_fit || "cover"}
          objectPosition={product.object_position || "center center"}
          focalX={focal?.focal_x ?? product.focal_x}
          focalY={focal?.focal_y ?? product.focal_y}
          zoom={focal?.zoom ?? product.focal_zoom}
          sizes="(min-width: 1024px) 25vw, 50vw"
        />
      </Link>
      <div className="mt-3 space-y-2">
        {product.color_tags?.length ? <div className="flex items-center gap-1.5">
          {product.color_tags.slice(0, 8).map((color) => <span key={color} title={color} className="h-3.5 w-3.5 rounded-full border border-black/10 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.45)]" style={{ backgroundColor: colorHex(color) }} />)}
        </div> : null}
        {productMetaLine(product) ? <p className="text-[11px] font-medium tracking-[0.01em] text-brand-charcoal/55 sm:text-xs">{productMetaLine(product)}</p> : null}
        <Link href={detailHref} className="block">
          <h3 className="line-clamp-2 text-[15px] font-semibold leading-[1.22] tracking-[-0.01em] text-brand-charcoal sm:text-[17px]">{product.nama}</h3>
        </Link>
        {productModel(product) ? <p className="text-xs leading-5 text-brand-charcoal/50 sm:text-[13px]">{productModel(product)}</p> : null}
        {productDetail(product) ? <p className="line-clamp-2 min-h-[2.5rem] text-xs leading-5 text-brand-charcoal/60 sm:text-sm sm:leading-6">{productDetail(product)}</p> : null}
        <div className="space-y-0.5">
          <p className="product-price text-[15px] text-brand-charcoal sm:text-[17px]">{productPrice(product)}</p>
          {product.compare_price ? <p className="text-xs text-brand-charcoal/40 line-through">{formatRupiah(product.compare_price)}</p> : null}
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Link href={detailHref} className="premium-ghost-button inline-flex min-h-10 items-center justify-center border px-3 text-xs font-semibold transition">Detail</Link>
        <AddToCartButton
          product={{ id: product.id || product.slug || product.nama, name: product.nama, category: product.kategori, priceLabel: productPrice(product), priceValue: Number(product.price ?? product.harga ?? product.base_price ?? 0) || undefined, href: detailHref, imageUrl: getProductImage(product), imageAlt: product.image_alt || product.nama }}
          className="inline-flex min-h-10 items-center justify-center bg-brand-green px-3 text-xs font-semibold text-white transition hover:bg-brand-charcoal"
        >
          Tambah
        </AddToCartButton>
      </div>
    </article>
  );
}

export default async function KoleksiPage() {
  const content = await getPublicContent();
  const pageHero = content.pageHeroes.find((hero) => hero.page_key === "koleksi");
  const serviceCategories = content.categories.filter((category) => category.status_aktif !== false);
  const collectionCategories = content.productCategories
    .filter((category) => category.is_active !== false && category.show_in_collection !== false)
    .sort((a, b) => collectionOrder(a) - collectionOrder(b));

  const sections = collectionCategories
    .map((category) => {
      const products = sortProducts(
        productsForCategoryRoute(content.products, content.productCategories, category.slug),
        category
      ).slice(0, collectionLimit(category));
      return { category, products };
    })
    .filter((section) => section.products.length > 0);

  return (
    <PublicShell content={content}>
      <PageHero
        label={pageHero?.label}
        title={pageHero?.title}
        description={pageHero?.subtitle}
        imageUrl={pageHero?.image_url}
        mobileImageUrl={pageHero?.mobile_image_url}
        objectPosition={pageHero?.object_position}
        mobileObjectPosition={pageHero?.mobile_object_position}
        objectFit={pageHero?.object_fit}
        imageZoom={pageHero?.focal_zoom}
        mobileImageZoom={pageHero?.mobile_focal_zoom}
        breadcrumbs={[{ label: "Beranda", href: "/" }, { label: "Koleksi" }]}
      />

      <section className="bg-brand-offWhite py-10 sm:py-12">
        <div className="section-shell grid grid-cols-1 gap-x-2 gap-y-6 md:grid-cols-2 lg:grid-cols-4">
          {serviceCategories.length ? serviceCategories.map((category) => (
            <ServiceCard key={category.nama_kategori} service={category} />
          )) : <p className="col-span-full p-8 text-center text-sm font-medium text-brand-charcoal/60">Belum ada kategori.</p>}
        </div>
      </section>

      <section className="bg-brand-offWhite py-10 sm:py-12">
        <div className="section-shell space-y-10">
          {sections.length ? sections.map(({ category, products }) => (
            <div key={category.slug}>
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h2 className="landing-section-title">{category.name}</h2>
                  {category.description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-brand-charcoal/60">{category.description}</p> : null}
                </div>
                <Link href={categoryPath(category.slug)} className="text-sm font-semibold underline-offset-4 hover:underline">Lihat Semua</Link>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-x-2 gap-y-7 lg:grid-cols-4">
                {products.map((product) => <CollectionProductCard key={product.id || product.slug || product.nama} product={product} />)}
              </div>
            </div>
          )) : (
            <div className="p-8 text-center">
              <p className="font-semibold">Produk belum tersedia</p>
              <p className="mt-2 text-sm text-brand-charcoal/60">Produk aktif akan tampil setelah kategori PIM dan produk terhubung.</p>
            </div>
          )}
        </div>
      </section>
    </PublicShell>
  );
}
