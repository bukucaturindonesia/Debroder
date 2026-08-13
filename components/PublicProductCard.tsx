import Link from "next/link";
import { ProductImageSwap } from "@/components/ProductImageSwap";
import { fallbackImages } from "@/lib/fallback-data";
import {
  productCardMetadata,
  productCardPriceState,
  productCardSwatches
} from "@/lib/product-card";
import { getProductCardImages } from "@/lib/product-gallery";
import type { Product } from "@/lib/types";

const MAX_VISIBLE_SWATCHES = 6;

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
  variant = "default",
  inquiryHref,
  inquiryLabel = "Pesan Sekarang"
}: {
  product: Product;
  className?: string;
  imageSizes?: string;
  variant?: "default" | "rail" | "compact";
  inquiryHref?: string;
  inquiryLabel?: string;
}) {
  const detailHref = productDetailHref(product);
  const focal = product.focal_points?.catalog;
  const cardImages = getProductCardImages(product);
  const swatches = productCardSwatches(product);
  const visibleSwatches = swatches.slice(0, MAX_VISIBLE_SWATCHES);
  const remainingSwatches = swatches.length - visibleSwatches.length;
  const metadata = productCardMetadata(product);
  const price = productCardPriceState(product);

  return (
    <article data-ui-card="product" data-ui-card-variant={variant} className={`public-product-card h-full min-w-0 public-product-card--${variant} ${className}`.trim()}>
      <Link
        href={detailHref}
        aria-label={`Lihat ${product.nama}, ${price.label}`}
        className="public-product-card-link group flex h-full min-w-0 flex-col"
      >
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
        <span className="public-product-card-hover" aria-hidden="true">
          Lihat produk <span aria-hidden="true">↗</span>
        </span>

        <div className="public-product-card-body min-w-0 flex-1">
          {visibleSwatches.length ? (
            <div
              className="public-product-swatches"
              role="list"
              aria-label={`${swatches.length} warna tersedia`}
            >
              {visibleSwatches.map((swatch) => (
                <span
                  key={`${swatch.label}-${swatch.hex}`}
                  role="listitem"
                  aria-label={swatch.label}
                  title={swatch.label}
                  className="public-product-swatch"
                  style={{ backgroundColor: swatch.hex }}
                />
              ))}
              {remainingSwatches > 0 ? (
                <span
                  className="public-product-swatch-count"
                  aria-label={`${remainingSwatches} warna lainnya`}
                >
                  +{remainingSwatches}
                </span>
              ) : null}
            </div>
          ) : null}
          {metadata ? <p className="public-product-meta line-clamp-2">{metadata}</p> : null}
          <h3 className="public-product-name line-clamp-2">
            {product.nama}
          </h3>
          <p className="public-product-price" data-price-state={price.status}>
            {price.label}
          </p>
        </div>
      </Link>
      {inquiryHref ? (
        <a
          href={inquiryHref}
          className="public-product-card-inquiry mt-4 inline-flex min-h-10 w-full items-center justify-center bg-brand-charcoal px-3 py-2 text-xs font-semibold text-white transition hover:bg-black/75 sm:px-5 sm:text-sm"
          target="_blank"
          rel="noopener noreferrer"
        >
          {inquiryLabel}
        </a>
      ) : null}
    </article>
  );
}
