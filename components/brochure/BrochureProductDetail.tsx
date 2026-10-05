import Image from "next/image";
import Link from "next/link";
import { BrochureShell } from "@/components/brochure/BrochureShell";
import { container, Eyebrow } from "@/components/brochure/BrochureContent";
import { BrochureInquiry } from "@/components/brochure/BrochureInquiry";
import { formatRupiah } from "@/lib/url";
import type { BrochureProduct } from "@/src/data/products";

export function BrochureProductDetail({ product }: { product: BrochureProduct }) {
  return <BrochureShell>
    <article className={`${container} brochure-product-page`}>
      <nav aria-label="Breadcrumb" className="brochure-breadcrumb"><Link href="/">Beranda</Link><span aria-hidden="true">/</span><Link href="/produk">Produk</Link><span aria-hidden="true">/</span><span aria-current="page">{product.name}</span></nav>
      <div className="brochure-detail-grid">
        <figure><div className="brochure-product-image"><Image src={product.image} alt={product.imageAlt} fill priority sizes="(max-width: 767px) 100vw, 48vw" className="object-contain" /></div><figcaption className="brochure-image-caption">{product.imageCaption}</figcaption></figure>
        <div><Eyebrow>Apparel DEBRODER</Eyebrow><h1 className="brochure-display brochure-detail-title">{product.name}</h1><p className="brochure-lead">{product.description}</p><p className="brochure-detail-copy">{product.detail}</p>
          {product.priceFrom !== undefined && product.priceFrom > 0 && <p>Mulai dari {formatRupiah(product.priceFrom)}</p>}
          <BrochureInquiry productName={product.name} />
          <Link href="/produk" className="brochure-text-link">Kembali ke produk <span aria-hidden="true">↗</span></Link>
        </div>
      </div>
    </article>
  </BrochureShell>;
}
