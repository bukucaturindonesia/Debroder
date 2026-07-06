import type { MetadataRoute } from "next";
import { getPublicContent } from "@/lib/public-data";
import { absoluteUrl } from "@/lib/site";

const routes = ["", "/koleksi", "/kaos-polos", "/jaket-hoodie", "/headwear", "/sablon-dtf", "/maklon-dtf", "/jersey", "/cetak-sublim", "/store", "/cara-order"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const content = await getPublicContent();
  const base: MetadataRoute.Sitemap = routes.map((route) => ({
    url: absoluteUrl(route),
    lastModified: now,
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : route === "/koleksi" ? 0.9 : 0.8
  }));
  const products: MetadataRoute.Sitemap = content.products.filter((product) => product.slug).map((product) => ({
    url: absoluteUrl(`/produk/${product.slug}`),
    lastModified: product.updated_at ? new Date(product.updated_at) : now,
    changeFrequency: "weekly",
    priority: 0.8
  }));
  const jerseyCategories: MetadataRoute.Sitemap = content.categories.filter((category) => category.category_key === "jersey" && category.slug).map((category) => ({
    url: absoluteUrl(`/jersey/${category.slug}`),
    lastModified: category.updated_at ? new Date(category.updated_at) : now,
    changeFrequency: "monthly",
    priority: 0.7
  }));
  return [...base, ...products, ...jerseyCategories];
}
