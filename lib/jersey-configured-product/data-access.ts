import "server-only";

import {
  CONTRACT_VERSIONS,
  type ConfiguredProductPricingInput,
  type PricingResult
} from "@/lib/contracts";
import type { ConfiguredProductDefinitionReadResult } from "@/lib/configured-product/data-access";
import { createSupabaseServerClient } from "@/lib/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  projectJerseyConfiguredProduct,
  selectJerseyConfiguredProductCandidate,
  type JerseyConfiguredProductConsumer,
  type JerseyConfiguredProductProjection
} from "./domain";

const JERSEY_CATEGORY_SLUG = "jersey";
const PRODUCT_SELECT = "id,name,nama,slug,status,status_aktif,sales_mode,product_type,pricing_mode,price,harga,base_price,uses_configurator,minimum_order_qty,config_schema,image_url,gambar_url,image_alt,updated_at";
const OPTION_SELECT = "id,name,slug,description,is_active,sort_order,updated_at";

type JerseyConfiguredProductFailure = {
  status: "not_found" | "unavailable" | "invalid";
  code: string;
  message: string;
  retryable: boolean;
};

export type JerseyConfiguredProductReadResult =
  | { status: "ready"; consumer: JerseyConfiguredProductConsumer }
  | JerseyConfiguredProductFailure;

type JerseyProductSelectionResult =
  | { status: "ready"; product: unknown }
  | JerseyConfiguredProductFailure;

export async function readJerseyConfiguredProduct(
  selector: { productId?: string; productSlug?: string } = {}
): Promise<JerseyConfiguredProductReadResult> {
  const client = createSupabaseServerClient();
  if (!client) {
    return unavailable(
      "jersey_configured_product.catalog_unavailable",
      "Jersey Custom belum dapat memuat katalog."
    );
  }

  const selectedProduct = await readSelectedJerseyProduct(client, selector);
  if (selectedProduct.status !== "ready") return selectedProduct;

  const [
    packages,
    materials,
    collarGroups,
    collars,
    addons,
    requiredServices,
    sizes
  ] = await Promise.all([
    client.from("jersey_packages").select(OPTION_SELECT).eq("is_active", true).order("sort_order"),
    client.from("jersey_materials").select(OPTION_SELECT).eq("is_active", true).order("sort_order"),
    client.from("jersey_collar_groups").select("id,name,slug,is_active,sort_order,updated_at").eq("is_active", true).order("sort_order"),
    client.from("jersey_collars").select(`${OPTION_SELECT},group_id`).eq("is_active", true).order("sort_order"),
    client.from("jersey_addons").select(OPTION_SELECT).eq("is_active", true).order("sort_order"),
    client.from("jersey_required_services").select("id,service_id,service_name,service_slug,is_active,sort_order,updated_at").eq("is_active", true).order("sort_order"),
    client.from("product_size_master").select("id,name,slug,is_active,sort_order,updated_at,size_group").eq("is_active", true).eq("size_group", "apparel").order("sort_order")
  ]);
  if (
    packages.error
    || materials.error
    || collarGroups.error
    || collars.error
    || addons.error
    || requiredServices.error
    || sizes.error
  ) {
    return unavailable(
      "jersey_configured_product.master_read_failed",
      "Master data Jersey gagal dibaca."
    );
  }

  return fromProjection(projectJerseyConfiguredProduct({
    product: selectedProduct.product,
    packages: packages.data,
    materials: materials.data,
    collarGroups: collarGroups.data,
    collars: collars.data,
    addons: addons.data,
    requiredServices: requiredServices.data,
    sizes: sizes.data
  }));
}

export async function readJerseyConfiguredProductDefinition(
  productId: string
): Promise<ConfiguredProductDefinitionReadResult> {
  const result = await readJerseyConfiguredProduct({ productId });
  if (result.status === "ready") {
    return { status: "ready", definition: result.consumer.definition };
  }
  return {
    status: result.status,
    code: result.code,
    message: result.message,
    retryable: result.retryable
  };
}

export async function priceJerseyConfiguredProduct(
  input: ConfiguredProductPricingInput
): Promise<PricingResult> {
  const client = createSupabaseServerClient();
  if (!client) throw new Error("Jersey pricing authority unavailable");

  const { data, error } = await client
    .from("products")
    .select("id,name,nama,status,status_aktif,sales_mode,product_type,pricing_mode,price,harga,base_price,uses_configurator,minimum_order_qty,config_schema,updated_at")
    .eq("id", input.definitionId)
    .eq("status", "active")
    .eq("status_aktif", true)
    .in("sales_mode", ["custom", "both"])
    .eq("product_type", "configurable_product")
    .eq("pricing_mode", "configurator_based")
    .eq("uses_configurator", true)
    .contains("config_schema", { entry_type: "jersey_configurator" })
    .maybeSingle();

  if (error || !data) throw new Error("Jersey pricing product unavailable");
  const minimumQuantity = Number(data.minimum_order_qty);
  if (!Number.isSafeInteger(minimumQuantity) || input.quantity < minimumQuantity) {
    throw new Error("Jersey pricing minimum quantity invalid");
  }
  const unitAmount = readCanonicalMoney(data.base_price ?? data.price ?? data.harga);
  const totalAmount = unitAmount * input.quantity;
  if (!Number.isSafeInteger(totalAmount)) throw new Error("Jersey pricing total invalid");

  const sourceReferences = [{
    type: "product",
    id: String(data.id),
    ...(typeof data.updated_at === "string" ? { version: data.updated_at } : {})
  }];
  const money = (amount: number) => ({ currency: "IDR" as const, amount });

  return {
    contractVersion: CONTRACT_VERSIONS.pricing,
    requestId: input.requestId,
    status: "priced",
    quantity: input.quantity,
    lines: [{
      key: `jersey:${data.id}`,
      label: typeof data.name === "string" && data.name.trim()
        ? data.name
        : String(data.nama || "Jersey Custom"),
      kind: "product_base",
      quantity: input.quantity,
      unitAmount: money(unitAmount),
      totalAmount: money(totalAmount),
      sourceReferences
    }],
    totals: {
      subtotal: money(totalAmount),
      discount: null,
      shipping: null,
      tax: null,
      grandTotal: money(totalAmount)
    },
    sourceReferences,
    policyReferences: input.sourceReferences,
    warnings: [],
    pricedAt: new Date().toISOString()
  };
}

async function readSelectedJerseyProduct(
  client: SupabaseClient,
  selector: { productId?: string; productSlug?: string }
): Promise<JerseyProductSelectionResult> {
  if (selector.productId || selector.productSlug) {
    let query = client.from("products").select(PRODUCT_SELECT).limit(1);
    if (selector.productId) query = query.eq("id", selector.productId);
    if (selector.productSlug) query = query.eq("slug", selector.productSlug);

    const { data, error } = await query.maybeSingle();
    if (error) {
      return unavailable(
        "jersey_configured_product.product_read_failed",
        "Produk Jersey gagal dibaca."
      );
    }
    if (!data) return notFound();
    return { status: "ready", product: data };
  }

  const mappedProduct = await readMappedJerseyProduct(client);
  if (mappedProduct.status === "ready") return mappedProduct;
  if (mappedProduct.status !== "not_found") return mappedProduct;

  const { data: fallbackRows, error: fallbackError } = await client
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("status", "active")
    .eq("status_aktif", true)
    .in("sales_mode", ["custom", "both"])
    .eq("product_type", "configurable_product")
    .eq("pricing_mode", "configurator_based")
    .eq("uses_configurator", true)
    .contains("config_schema", { entry_type: "jersey_configurator" })
    .order("slug")
    .limit(50);
  if (fallbackError) {
    return unavailable(
      "jersey_configured_product.product_read_failed",
      "Produk Jersey gagal dibaca."
    );
  }

  const product = selectJerseyConfiguredProductCandidate(
    (Array.isArray(fallbackRows) ? fallbackRows : []).map((row) => ({
      product: row,
      isDefault: false,
      sortOrder: 0
    }))
  );
  return product ? { status: "ready", product } : notFound();
}

async function readMappedJerseyProduct(
  client: SupabaseClient
): Promise<JerseyProductSelectionResult> {
  const { data: category, error: categoryError } = await client
    .from("custom_categories")
    .select("id")
    .eq("slug", JERSEY_CATEGORY_SLUG)
    .eq("entry_type", "jersey_configurator")
    .eq("status", "published")
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();
  if (categoryError) {
    return unavailable(
      "jersey_configured_product.mapping_read_failed",
      "Pilihan produk Jersey gagal dibaca."
    );
  }
  if (!category || typeof category.id !== "string") return notFound();

  const { data: mappingRows, error: mappingError } = await client
    .from("custom_category_products")
    .select("product_id,is_default,sort_order")
    .eq("custom_category_id", category.id)
    .eq("is_active", true)
    .order("is_default", { ascending: false })
    .order("sort_order")
    .order("product_id")
    .limit(100);
  if (mappingError) {
    return unavailable(
      "jersey_configured_product.mapping_read_failed",
      "Pilihan produk Jersey gagal dibaca."
    );
  }

  const mappings = (Array.isArray(mappingRows) ? mappingRows : []).flatMap((row) => {
    if (!row || typeof row.product_id !== "string") return [];
    return [{
      productId: row.product_id,
      isDefault: row.is_default === true,
      sortOrder: typeof row.sort_order === "number" && Number.isSafeInteger(row.sort_order)
        ? row.sort_order
        : 0
    }];
  });
  if (!mappings.length) return notFound();

  const productIds = Array.from(new Set(mappings.map((mapping) => mapping.productId)));
  const { data: productRows, error: productError } = await client
    .from("products")
    .select(PRODUCT_SELECT)
    .in("id", productIds);
  if (productError) {
    return unavailable(
      "jersey_configured_product.product_read_failed",
      "Produk Jersey gagal dibaca."
    );
  }

  const productsById = new Map(
    (Array.isArray(productRows) ? productRows : []).flatMap((row) => (
      row && typeof row.id === "string" ? [[row.id, row] as const] : []
    ))
  );
  const product = selectJerseyConfiguredProductCandidate(
    mappings.flatMap((mapping) => {
      const candidate = productsById.get(mapping.productId);
      return candidate ? [{
        product: candidate,
        isDefault: mapping.isDefault,
        sortOrder: mapping.sortOrder
      }] : [];
    })
  );

  return product ? { status: "ready", product } : notFound();
}

function readCanonicalMoney(value: unknown) {
  const amount = typeof value === "number" ? value : Number(value);
  if (!Number.isSafeInteger(amount) || amount < 0) {
    throw new Error("Jersey pricing amount invalid");
  }
  return amount;
}

function fromProjection(
  result: JerseyConfiguredProductProjection
): JerseyConfiguredProductReadResult {
  if (result.status === "ready") return result;
  return {
    status: result.status,
    code: result.code,
    message: result.message,
    retryable: false
  };
}

function notFound(): JerseyConfiguredProductFailure {
  return {
    status: "not_found",
    code: "jersey_configured_product.not_available",
    message: "Produk Jersey Custom belum tersedia.",
    retryable: false
  };
}

function unavailable(
  code: string,
  message: string
): JerseyConfiguredProductFailure {
  return { status: "unavailable", code, message, retryable: true };
}
