import Link from "next/link";
import { listProducts } from "@/lib/supabase/products";
import { formatRupiah } from "@/lib/money";
import { getDefaultVariant, getVariantThumbnail } from "@/lib/product-utils";

export default async function HomePage() {
  const products = await listProducts();

  return (
    <div className="page-shell">
      <div className="stack" style={{ marginBottom: 24 }}>
        <p className="eyebrow">Katalog</p>
        <h1 className="product-title">Produk DEBRODER</h1>
      </div>

      <div className="catalog-grid">
        {products.map((product) => {
          const variant = getDefaultVariant(product);
          const thumbnail = variant ? getVariantThumbnail(variant) : null;

          return (
            <Link
              className="product-tile"
              href={`/produk/${product.slug}`}
              key={product.id}
            >
              {thumbnail ? (
                <img src={thumbnail} alt={product.name} />
              ) : (
                <div style={{ aspectRatio: "4 / 5" }} />
              )}
              <div className="product-tile-body">
                <span className="eyebrow">{product.category?.name ?? "Produk"}</span>
                <strong>{product.name}</strong>
                <span className="muted">Mulai {formatRupiah(product.basePrice)}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

