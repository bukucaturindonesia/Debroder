import type { MetadataRoute } from "next";
import { getPublicContent } from "@/lib/public-data";
import { absoluteUrl } from "@/lib/site";
import { listCustomCategories } from "@/lib/custom-commerce/data";

const routes = ["", "/koleksi", "/keranjang", "/custom", "/kaos-polos", "/jersey", "/jersey/shop", "/jersey/configurator", "/jaket-hoodie", "/kemeja", "/headwear", "/sablon-dtf", "/maklon-dtf", "/cetak-sublim", "/store", "/cara-order"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const [content, customCategories] = await Promise.all([getPublicContent(), listCustomCategories()]);
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
  const customRoutes: MetadataRoute.Sitemap = customCategories.filter((category) => category.entryType === "project_builder").map((category) => ({
    url: absoluteUrl(`/custom/${category.slug}`),
    lastModified: category.updatedAt ? new Date(category.updatedAt) : now,
    changeFrequency: "monthly",
    priority: 0.8
  }));
  return [...base, ...products, ...jerseyCategories, ...customRoutes];
}
