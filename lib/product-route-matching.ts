import type { Product, ProductCategory } from "@/lib/types";

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function directText(product: Product) {
  return [
    product.nama,
    product.kategori,
    product.subcategory || "",
    product.slug || "",
    product.link_url || ""
  ].map((item) => normalize(item || "")).join(" ");
}

function tagText(product: Product) {
  return [
    ...(product.intent_tags || []),
    ...(product.collection_tags || []),
    ...(product.material_tags || [])
  ].map((item) => normalize(item || "")).join(" ");
}

function hasAny(value: string, keywords: string[]) {
  return keywords.some((keyword) => value.includes(keyword));
}

export function productMatchesRoute(product: Product, routeKey: string) {
  const direct = directText(product);
  const tags = tagText(product);
  const all = `${direct} ${tags}`;

  switch (routeKey) {
    case "kaos-polos":
      return (
        hasAny(direct, ["kaos-polos", "kaos", "cotton", "combed", "new-state", "nsa"])
        || hasAny(tags, ["kaos-polos"])
      ) && !hasAny(direct, ["polo", "jaket", "jacket", "hoodie", "crewneck", "headwear", "topi", "cap", "hat", "jersey", "sablon-dtf", "maklon-dtf", "cetak-sublim"]);

    case "polo-shirt":
      return hasAny(all, ["polo-shirt", "polo", "lacoste", "polo-cvc", "polo-dry-fit"]);

    case "kemeja":
      return hasAny(all, ["kemeja", "pdh", "pdl", "seragam-kantor"]);

    case "aksesori-lainnya":
      return hasAny(all, ["aksesori-lainnya", "patch", "emblem", "lanyard", "label", "hang-tag", "merchandise", "aksesori"]);

    case "jaket-hoodie":
      return hasAny(all, ["jaket-hoodie", "jaket", "jacket", "hoodie", "crewneck", "sweater"]);

    case "headwear":
      return hasAny(all, ["headwear", "topi", "cap", "hat"]);

    case "sablon-dtf":
      return hasAny(direct, ["sablon-dtf", "sablon", "dtf"]) && !hasAny(direct, ["maklon"]);

    case "maklon-dtf":
      return hasAny(direct, ["maklon-dtf", "maklon"]) || hasAny(tags, ["maklon-dtf"]);

    case "jersey":
      return hasAny(direct, ["kategori-jersey", "jersey-futsal", "jersey-sepak", "jersey-esports", "jersey-basket", "jersey-sepeda", "jersey-komunitas"])
        || normalize(product.kategori || "") === "jersey"
        || normalize(product.slug || "").startsWith("jersey-");

    case "cetak-sublim":
      return hasAny(direct, ["cetak-sublim", "sublim", "sublimasi"]) || normalize(product.kategori || "") === "cetak-sublim";

    default:
      return hasAny(all, [normalize(routeKey)]);
  }
}

export function productsForRoute(products: Product[], routeKey: string) {
  return products.filter((product) => productMatchesRoute(product, routeKey));
}

export function productMatchesCategory(product: Product, categories: ProductCategory[], routeKey: string) {
  const category = categories.find((item) => item.slug === routeKey);
  if (!category) return productMatchesRoute(product, routeKey);
  if (category.id && product.product_category_id) {
    return product.product_category_id === category.id;
  }
  if (!product.product_category_id && category.name && product.kategori === category.name) return true;
  if (!product.product_category_id) return productMatchesRoute(product, routeKey);
  return false;
}

export function productsForCategoryRoute(products: Product[], categories: ProductCategory[], routeKey: string) {
  return products.filter((product) => productMatchesCategory(product, categories, routeKey));
}
