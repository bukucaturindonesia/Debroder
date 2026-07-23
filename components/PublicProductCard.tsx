import Link from "next/link";
import { AddToCartButton } from "@/components/CartProvider";
import { ProductImageSwap } from "@/components/ProductImageSwap";
import { fallbackImages } from "@/lib/fallback-data";
import { productCardMetadata, productCardPrice } from "@/lib/product-card";
import { getProductCardImages } from "@/lib/product-gallery";
import { resolvePublicQuickAdd } from "@/lib/public-quick-add";
import type { Product } from "@/lib/types";
import { formatRupiah } from "@/lib/url";

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function productDetailHref(product: Product) {
  return `/produk/${product.slug || slugify(product.nama)}`;
}

export function PublicProductCard({
  product,
  className = "",
  imageSizes = "(min-width: 1024px) 25vw, 50vw",
  showActions = false
}: {
  product: Product;
  className?: string;
  imageSizes?: string;
  showActions?: boolean;
}) {
  const detailHref = productDetailHref(product);
  const focal = product.focal_points?.catalog;
  const cardImages = getProductCardImages(product);
  const metadata = productCardMetadata(product);
  const priceLabel = productCardPrice(product);
  const quickAdd = resolvePublicQuickAdd(product, {
    detailHref,
    imageUrl: cardImages.primary,
    imageAlt: product.image_alt || product.nama,
    priceLabel
  });
  const labels = Array.from(
    new Set(
      [
        product.badge,
        product.label_new && "New",
        product.label_promo && "Promo",
        product.label_best_seller && "Terlaris"
      ].filter(Boolean)
    )
  ) as string[];

  return (
    <article className={`public-product-card min-w-0 ${className}`.trim()}>
      <Link
        href={detailHref}
        aria-label={`Buka detail ${product.nama}`}
        className="public-product-card-link group block min-w-0"
      >
        <div className="relative">
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
            sizes={imageSizes}
          />
          {labels.length ? (
            <div className="pointer-events-none absolute left-2 top-2 flex max-w-[calc(100%-1rem)] flex-wrap gap-1">
              {labels.map((item) => (
                <span key={item} className="public-product-badge bg-white px-2 py-1">
                  {item}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <div className="public-product-card-body min-w-0">
          {metadata ? <p className="public-product-meta truncate">{metadata}</p> : null}
          <h3 className={`public-product-name line-clamp-2 ${metadata ? "has-metadata" : ""}`}>
            {product.nama}
          </h3>
          {priceLabel ? (
            <div className="public-product-price-block">
              <p className="public-product-price">{priceLabel}</p>
              {product.compare_price ? (
                <p className="public-product-compare-price line-through">
                  {formatRupiah(product.compare_price)}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </Link>

      {showActions ? (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Link
            href={detailHref}
            className="public-secondary-action inline-flex min-h-10 items-center justify-center border px-3 text-sm font-semibold transition"
          >
            Detail
          </Link>

          {quickAdd.mode === "add" ? (
            <AddToCartButton
              product={quickAdd.product}
              className="inline-flex min-h-10 items-center justify-center bg-black px-3 text-sm font-semibold text-white transition hover:bg-black/80"
            >
              Tambah
            </AddToCartButton>
          ) : quickAdd.mode === "options" ? (
            <Link
              href={detailHref}
              className="inline-flex min-h-10 items-center justify-center bg-black px-3 text-sm font-semibold text-white transition hover:bg-black/80"
            >
              Pilih opsi
            </Link>
          ) : (
            <span
              aria-disabled="true"
              className="inline-flex min-h-10 cursor-not-allowed items-center justify-center bg-black/10 px-3 text-sm font-semibold text-black/40"
            >
              Stok habis
            </span>
          )}
        </div>
      ) : null}
    </article>
  );
}
