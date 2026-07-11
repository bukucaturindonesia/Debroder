import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductDetailClient } from "@/components/product/product-detail-client";
import { listCustomServices } from "@/lib/supabase/custom-services";
import { getProductBySlug } from "@/lib/supabase/products";

interface ProductPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ color?: string }>;
}

export async function generateMetadata({
  params
}: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const [product, customServices] = await Promise.all([
    getProductBySlug(slug),
    listCustomServices()
  ]);

  if (!product) {
    return {
      title: "Produk tidak ditemukan"
    };
  }

  return {
    title: product.name,
    description: product.description ?? undefined
  };
}

export default async function ProductPage({
  params,
  searchParams
}: ProductPageProps) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const product = await getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  return (
    <ProductDetailClient
      product={product}
      initialColorSlug={query.color ?? null}
      customServices={customServices}
    />
  );
}
