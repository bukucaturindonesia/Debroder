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
  imageSizes = "(min-width: 1024px) 25vw, 50vw"
}: {
  product: Product;
  className?: string;
  imageSizes?: string;
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
    <article className={`public-product-card min-w-0 ${className}`.trim()}>
      <Link
        href={detailHref}
        aria-label={`Lihat ${product.nama}, ${price.label}`}
        className="public-product-card-link group block min-w-0"
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

        <div className="public-product-card-body min-w-0">
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
    </article>
  );
}
