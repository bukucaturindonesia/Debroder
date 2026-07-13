import type { Product } from "@/lib/types";

export type JerseySort =
  | "featured"
  | "newest"
  | "best-selling"
  | "price-low"
  | "price-high";

export type JerseyProductFilters = {
  query: string;
  category: string;
  color: string;
  size: string;
  availability: string;
  price: string;
  sort: JerseySort;
};

export type FilterOption = {
  value: string;
  label: string;
};

export const EMPTY_JERSEY_FILTERS: JerseyProductFilters = {
  query: "",
  category: "all",
  color: "all",
  size: "all",
  availability: "all",
  price: "all",
  sort: "featured"
};

export const JERSEY_COMMERCE_NAV_ITEMS = [
  { label: "Jersey", href: "/jersey" },
  { label: "Football", href: "/jersey/shop?category=football" },
  { label: "Futsal", href: "/jersey/shop?category=futsal" },
  { label: "Esports", href: "/jersey/shop?category=esports" },
  { label: "Custom", href: "/jersey/configurator" },
  { label: "Shop All", href: "/jersey/shop" }
] as const;

export function normalizeJerseyFilter(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function uniqueOptions(values: Array<string | null | undefined>) {
  const options = new Map<string, string>();
  values.forEach((value) => {
    const label = value?.trim();
    if (!label) return;
    options.set(normalizeJerseyFilter(label), label);
  });
  return Array.from(options, ([value, label]) => ({ value, label })).sort(
    (a, b) => a.label.localeCompare(b.label, "id")
  );
}

export function jerseyProductColors(product: Product) {
  const variantColors = (product.variants || [])
    .filter((variant) => variant.is_active !== false)
    .map((variant) => variant.color_name || variant.variant_name)
    .filter(Boolean) as string[];
  return uniqueOptions(
    variantColors.length ? variantColors : product.color_tags || []
  );
}

export function jerseyProductSizes(product: Product) {
  const variantSizes = (product.variants || [])
    .filter((variant) => variant.is_active !== false)
    .flatMap((variant) => variant.sizes || [])
    .filter((size) => size.is_active !== false)
    .map((size) => size.size_name);
  return uniqueOptions(
    variantSizes.length ? variantSizes : product.size_tags || []
  );
}

export function jerseyProductPrice(product: Product) {
  const raw = product.price ?? product.harga ?? product.base_price;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  const direct = Number(raw);
  if (Number.isFinite(direct)) return direct;
  const digits = Number(String(raw || "").replace(/[^\d]/g, ""));
  return Number.isFinite(digits) ? digits : 0;
}

export function jerseyHasReadyStock(product: Product) {
  if (typeof product.stock === "number" && product.stock > 0) return true;
  return (product.variants || []).some(
    (variant) =>
      variant.is_active !== false &&
      (variant.sizes || []).some(
        (size) => size.is_active !== false && Number(size.stock) > 0
      )
  );
}

export function jerseyHasCustomAvailability(product: Product) {
  return Boolean(
    product.uses_configurator ||
      product.product_type === "configurable_product" ||
      product.pricing_mode === "configurator_based" ||
      product.pricing_mode === "custom_quote"
  );
}

export function jerseyProductStatus(product: Product) {
  const ready = jerseyHasReadyStock(product);
  const custom = jerseyHasCustomAvailability(product);
  if (ready && custom) return "Ready Stock + Custom";
  if (ready) {
    const stock = Number(product.stock || 0);
    return stock > 0 && stock <= 5 ? "Low Stock" : "Ready Stock";
  }
  if (custom) return "Custom Available";
  const hasKnownStock =
    typeof product.stock === "number" ||
    (product.variants || []).some((variant) => (variant.sizes || []).length);
  if (hasKnownStock) return "Sold Out";
  if (product.label_new) return "New";
  return "";
}

export function jerseyFilterOptions(products: Product[]) {
  const categories = uniqueOptions(
    products.map((product) => product.subcategory)
  );
  const colors = uniqueOptions(
    products.flatMap((product) =>
      jerseyProductColors(product).map((option) => option.label)
    )
  );
  const sizes = uniqueOptions(
    products.flatMap((product) =>
      jerseyProductSizes(product).map((option) => option.label)
    )
  );

  const availability: FilterOption[] = [];
  if (products.some(jerseyHasReadyStock)) {
    availability.push({ value: "ready", label: "Ready Stock" });
  }
  if (products.some(jerseyHasCustomAvailability)) {
    availability.push({ value: "custom", label: "Custom Available" });
  }

  const priced = products.map(jerseyProductPrice).filter((price) => price > 0);
  const price: FilterOption[] = [];
  if (priced.some((amount) => amount < 100_000)) {
    price.push({ value: "under-100", label: "Di bawah Rp100 ribu" });
  }
  if (priced.some((amount) => amount >= 100_000 && amount <= 200_000)) {
    price.push({ value: "100-200", label: "Rp100–200 ribu" });
  }
  if (priced.some((amount) => amount > 200_000)) {
    price.push({ value: "over-200", label: "Di atas Rp200 ribu" });
  }

  return { categories, colors, sizes, availability, price };
}

function searchText(product: Product) {
  return [
    product.nama,
    product.kategori,
    product.subcategory,
    product.brand,
    product.sku,
    ...(product.material_tags || []),
    ...(product.color_tags || []),
    ...(product.size_tags || []),
    ...(product.collection_tags || []),
    ...(product.intent_tags || [])
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function filterJerseyProducts(
  products: Product[],
  filters: JerseyProductFilters
) {
  const query = filters.query.trim().toLowerCase();
  return products
    .filter((product) => !query || searchText(product).includes(query))
    .filter(
      (product) =>
        filters.category === "all" ||
        normalizeJerseyFilter(product.subcategory || "") === filters.category
    )
    .filter(
      (product) =>
        filters.color === "all" ||
        jerseyProductColors(product).some(
          (option) => option.value === filters.color
        )
    )
    .filter(
      (product) =>
        filters.size === "all" ||
        jerseyProductSizes(product).some(
          (option) => option.value === filters.size
        )
    )
    .filter((product) => {
      if (filters.availability === "ready") {
        return jerseyHasReadyStock(product);
      }
      if (filters.availability === "custom") {
        return jerseyHasCustomAvailability(product);
      }
      return true;
    })
    .filter((product) => {
      const amount = jerseyProductPrice(product);
      if (filters.price === "under-100") return amount > 0 && amount < 100_000;
      if (filters.price === "100-200") {
        return amount >= 100_000 && amount <= 200_000;
      }
      if (filters.price === "over-200") return amount > 200_000;
      return true;
    })
    .sort((a, b) => {
      if (filters.sort === "newest") {
        return (
          new Date(b.created_at || 0).getTime() -
          new Date(a.created_at || 0).getTime()
        );
      }
      if (filters.sort === "best-selling") {
        return Number(b.sales_count || 0) - Number(a.sales_count || 0);
      }
      if (filters.sort === "price-low") {
        return jerseyProductPrice(a) - jerseyProductPrice(b);
      }
      if (filters.sort === "price-high") {
        return jerseyProductPrice(b) - jerseyProductPrice(a);
      }
      return Number(a.urutan || 0) - Number(b.urutan || 0);
    });
}
