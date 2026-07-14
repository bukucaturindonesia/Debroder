import type { Metadata } from "next";
import Link from "next/link";
import { AddToCartButton } from "@/components/CartProvider";
import { PageHero, PublicShell, ServiceCard } from "@/components/PublicPage";
import { ProductImageSwap } from "@/components/ProductImageSwap";
import { fallbackImages, getProductImage } from "@/lib/fallback-data";
import { getProductCardImages } from "@/lib/product-gallery";
import { productCardMetadata, productCardPrice } from "@/lib/product-card";
import { productMatchesNavigationColor, productMatchesNavigationStatus } from "@/lib/public-navigation";
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

type KoleksiPageProps = {
  searchParams?: Promise<{
    color?: string | string[];
    status?: string | string[];
    label?: string | string[];
    sort?: string | string[];
  }>;
};

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function slugify(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function normalizeFilterValue(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
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
  const metadata = productCardMetadata(product);
  const priceLabel = productCardPrice(product);

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
      <div className="mt-3 min-w-0">
        {metadata ? <p className="text-[11px] font-medium leading-4 tracking-[0.01em] text-brand-charcoal/55 sm:text-xs">{metadata}</p> : null}
        <Link href={detailHref} className={`${metadata ? "mt-1.5" : ""} block`}>
          <h3 className="line-clamp-2 text-[15px] font-semibold leading-[1.3] tracking-[-0.01em] text-brand-charcoal sm:text-[17px]">{product.nama}</h3>
        </Link>
        {priceLabel ? <div className="mt-2">
          <p className="product-price text-[15px] font-semibold text-brand-charcoal sm:text-[17px]">{priceLabel}</p>
          {product.compare_price ? <p className="mt-0.5 text-xs text-brand-charcoal/40 line-through">{formatRupiah(product.compare_price)}</p> : null}
        </div> : null}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Link href={detailHref} className="premium-ghost-button inline-flex min-h-10 items-center justify-center border px-3 text-xs font-semibold transition">Detail</Link>
        <AddToCartButton
          product={{ id: product.id || product.slug || product.nama, name: product.nama, category: product.kategori, priceLabel, priceValue: Number(product.price ?? product.harga ?? product.base_price ?? 0) || undefined, href: detailHref, imageUrl: getProductImage(product), imageAlt: product.image_alt || product.nama }}
          className="inline-flex min-h-10 items-center justify-center bg-black px-3 text-xs font-semibold text-white transition hover:bg-black/75"
        >
          Tambah
        </AddToCartButton>
      </div>
    </article>
  );
}

export default async function KoleksiPage({ searchParams }: KoleksiPageProps) {
  const content = await getPublicContent();
  const params = searchParams ? await searchParams : {};
  const selectedColor = normalizeFilterValue(firstParam(params.color) || "all");
  const selectedStatus = normalizeFilterValue(firstParam(params.status) || "all");
  const selectedLabel = normalizeFilterValue(firstParam(params.label) || "all");
  const selectedSort = normalizeFilterValue(firstParam(params.sort) || "order");
  const hasCollectionFilter = [selectedColor, selectedStatus, selectedLabel, selectedSort].some((value) => value !== "all" && value !== "order");
  const filteredProducts = content.products
    .filter((product) => product.status_aktif !== false)
    .filter((product) => productMatchesNavigationColor(product, selectedColor))
    .filter((product) => productMatchesNavigationStatus(product, selectedStatus))
    .filter((product) => selectedLabel === "all"
      || (selectedLabel === "new" && product.label_new)
      || (selectedLabel === "best" && product.label_best_seller)
      || (selectedLabel === "promo" && product.label_promo))
    .sort((a, b) => {
      if (selectedSort === "best-selling") return Number(b.sales_count || 0) - Number(a.sales_count || 0);
      if (selectedSort === "newest") return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      return a.urutan - b.urutan;
    });
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

      {hasCollectionFilter ? <section className="bg-brand-offWhite py-10 sm:py-12" aria-labelledby="collection-results-heading">
        <div className="section-shell">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-black/10 pb-5">
            <div>
              <h2 id="collection-results-heading" className="landing-section-title">Hasil Koleksi</h2>
              <p className="mt-2 text-sm text-black/60">{filteredProducts.length} produk sesuai pilihan Anda.</p>
            </div>
            <Link href="/koleksi" className="inline-flex min-h-10 items-center justify-center rounded-full border border-black px-4 text-sm font-semibold text-black transition hover:bg-black hover:text-white">Hapus Filter</Link>
          </div>
          {filteredProducts.length ? <div className="mt-6 grid grid-cols-2 gap-x-2 gap-y-7 lg:grid-cols-4">
            {filteredProducts.map((product) => <CollectionProductCard key={product.id || product.slug || product.nama} product={product} />)}
          </div> : <div className="py-12 text-center"><p className="font-semibold">Produk tidak ditemukan</p><p className="mt-2 text-sm text-black/60">Pilihan ini belum memiliki produk aktif.</p></div>}
        </div>
      </section> : <>
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
      </>}
    </PublicShell>
  );
}
