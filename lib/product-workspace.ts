import type { ProductLifecycle, ProductManagerCapabilities } from "@/lib/product-manager";

export const PRODUCT_WORKSPACE_MODULES = [
  { key: "information", label: "Informasi" },
  { key: "variants", label: "Varian" },
  { key: "inventory", label: "Harga & Stok" },
  { key: "media", label: "Media" },
  { key: "review", label: "Review & Publish" }
] as const;

export type ProductWorkspaceModule = (typeof PRODUCT_WORKSPACE_MODULES)[number]["key"];

export type ProductWorkspaceProduct = {
  id: string;
  name: string;
  slug: string;
  status: ProductLifecycle;
  categoryId: string | null;
  categoryName: string;
  basePrice: number;
  sku: string | null;
  imageUrl: string | null;
  updatedAt: string | null;
};

export type ProductWorkspacePayload = {
  role: string;
  capabilities: ProductManagerCapabilities;
  product: ProductWorkspaceProduct;
};

const PRODUCT_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidProductWorkspaceId(value: string) {
  return PRODUCT_ID_PATTERN.test(value);
}

export function productWorkspacePath(
  productId: string,
  module: ProductWorkspaceModule = "information"
) {
  return `/admin/products/${encodeURIComponent(productId)}/${module}`;
}

export function productWorkspaceModuleFromPath(pathname: string): ProductWorkspaceModule {
  const segments = pathname.split("/").filter(Boolean);
  const segment = segments[segments.length - 1];
  return PRODUCT_WORKSPACE_MODULES.some((item) => item.key === segment)
    ? segment as ProductWorkspaceModule
    : "information";
}
