import type { Metadata } from "next";
import Link from "next/link";
import { AddToCartButton } from "@/components/CartProvider";
import { PageHero, PublicShell, ServiceCard } from "@/components/PublicPage";
import { SafeImage } from "@/components/SafeImage";
import { fallbackImages, getProductImage } from "@/lib/fallback-data";
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

  return (
    <article className="group min-w-0">
      <Link href={detailHref} className="block">
        <div className="relative aspect-[4/5] w-full overflow-hidden bg-white">
          <SafeImage
            src={getProductImage(product)}
            fallbackSrc={fallbackImages.product}
            alt={product.image_alt || product.nama}
            fill
            className="object-cover transition duration-500 group-hover:scale-[1.02]"
            objectFit={product.object_fit || "cover"}
            focalX={focal?.focal_x ?? product.focal_x}
            focalY={focal?.focal_y ?? product.focal_y}
            zoom={focal?.zoom ?? product.focal_zoom}
            sizes="(min-width: 1024px) 25vw, 50vw"
          />
        </div>
      </Link>
      <Link href={detailHref} className="mt-3 block">
        <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug sm:text-base">{product.nama}</h3>
      </Link>
      <p className="mt-1 text-sm text-brand-charcoal/55">{product.subcategory || product.kategori}</p>
      <p className="mt-2 text-[15px] font-semibold">{productPrice(product)}</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Link href={detailHref} className="inline-flex min-h-9 items-center justify-center border border-brand-softGray px-2 text-[11px] font-semibold sm:min-h-10 sm:text-xs">Detail</Link>
        <AddToCartButton
          product={{ id: product.id || product.slug || product.nama, name: product.nama, category: product.kategori, priceLabel: productPrice(product), href: detailHref }}
          className="inline-flex min-h-9 items-center justify-center bg-brand-green px-2 text-[11px] font-semibold text-white sm:min-h-10 sm:text-xs"
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
        label={pageHero?.label || "KOLEKSI"}
        title={pageHero?.title || "Layanan & Produk DE BRODER"}
        description={pageHero?.subtitle || "Temukan kebutuhan apparel, sablon, jersey, dan layanan custom dalam satu tempat."}
        imageUrl={pageHero?.image_url}
        mobileImageUrl={pageHero?.mobile_image_url}
        objectPosition={pageHero?.object_position}
        mobileObjectPosition={pageHero?.mobile_object_position}
        objectFit={pageHero?.object_fit}
        imageZoom={pageHero?.focal_zoom}
        mobileImageZoom={pageHero?.mobile_focal_zoom}
        breadcrumbs={[{ label: "Beranda", href: "/" }, { label: "Koleksi" }]}
      />

      <section className="bg-brand-offWhite py-12 sm:py-16">
        <div className="section-shell grid grid-cols-1 gap-x-2 gap-y-6 md:grid-cols-2 lg:grid-cols-4">
          {serviceCategories.length ? serviceCategories.map((category) => (
            <ServiceCard key={category.nama_kategori} service={category} />
          )) : <p className="col-span-full bg-white p-8 text-center text-sm font-medium text-brand-charcoal/60">Belum ada kategori.</p>}
        </div>
      </section>

      <section className="bg-white py-12 sm:py-16">
        <div className="section-shell space-y-14">
          {sections.length ? sections.map(({ category, products }) => (
            <div key={category.slug}>
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <h2 className="text-[28px] font-semibold leading-[1.15] tracking-normal sm:text-[36px]">{category.name}</h2>
                  {category.description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-brand-charcoal/60">{category.description}</p> : null}
                </div>
                <Link href={categoryPath(category.slug)} className="text-sm font-semibold underline-offset-4 hover:underline">Lihat Semua</Link>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-x-2 gap-y-7 lg:grid-cols-4">
                {products.map((product) => <CollectionProductCard key={product.id || product.slug || product.nama} product={product} />)}
              </div>
            </div>
          )) : (
            <div className="bg-brand-offWhite p-8 text-center">
              <p className="font-semibold">Produk belum tersedia</p>
              <p className="mt-2 text-sm text-brand-charcoal/60">Produk aktif akan tampil setelah kategori PIM dan produk terhubung.</p>
            </div>
          )}
        </div>
      </section>
    </PublicShell>
  );
}
