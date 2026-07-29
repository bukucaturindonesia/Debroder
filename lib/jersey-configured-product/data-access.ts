import "server-only";

import {
  CONTRACT_VERSIONS,
  type ConfiguredProductPricingInput,
  type PricingResult
} from "@/lib/contracts";
import type { ConfiguredProductDefinitionReadResult } from "@/lib/configured-product/data-access";
import { createSupabaseServerClient } from "@/lib/supabase";
import {
  projectJerseyConfiguredProduct,
  type JerseyConfiguredProductConsumer,
  type JerseyConfiguredProductProjection
} from "./domain";

const PRODUCT_SELECT = "id,name,nama,slug,status,status_aktif,product_type,pricing_mode,price,harga,base_price,uses_configurator,minimum_order_qty,config_schema,image_url,gambar_url,image_alt,updated_at";
const OPTION_SELECT = "id,name,slug,description,is_active,sort_order,updated_at";

export type JerseyConfiguredProductReadResult =
  | { status: "ready"; consumer: JerseyConfiguredProductConsumer }
  | {
      status: "not_found" | "unavailable" | "invalid";
      code: string;
      message: string;
      retryable: boolean;
    };

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

  let productQuery = client
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("status", "active")
    .eq("status_aktif", true)
    .eq("product_type", "configurable_product")
    .eq("pricing_mode", "configurator_based")
    .eq("uses_configurator", true)
    .contains("config_schema", { entry_type: "jersey_configurator" })
    .limit(2);
  if (selector.productId) productQuery = productQuery.eq("id", selector.productId);
  if (selector.productSlug) productQuery = productQuery.eq("slug", selector.productSlug);

  const { data: productRows, error: productError } = await productQuery;
  if (productError) {
    return unavailable(
      "jersey_configured_product.product_read_failed",
      "Produk Jersey gagal dibaca."
    );
  }
  if (!Array.isArray(productRows) || productRows.length === 0) {
    return {
      status: "not_found",
      code: "jersey_configured_product.not_available",
      message: "Produk Jersey Custom belum tersedia.",
      retryable: false
    };
  }
  if (productRows.length !== 1) {
    return {
      status: "invalid",
      code: "jersey_configured_product.product_ambiguous",
      message: "Authority produk Jersey tidak tunggal.",
      retryable: false
    };
  }

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
    product: productRows[0],
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
    .select("id,name,nama,status,status_aktif,product_type,pricing_mode,price,harga,base_price,updated_at")
    .eq("id", input.definitionId)
    .eq("status", "active")
    .eq("status_aktif", true)
    .eq("product_type", "configurable_product")
    .eq("pricing_mode", "configurator_based")
    .maybeSingle();

  if (error || !data) throw new Error("Jersey pricing product unavailable");
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

function unavailable(code: string, message: string): JerseyConfiguredProductReadResult {
  return { status: "unavailable", code, message, retryable: true };
}
