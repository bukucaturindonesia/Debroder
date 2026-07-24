import "server-only";

import type { ConfiguredProductDefinitionReadResult } from "@/lib/configured-product/data-access";
import { createSupabaseServerClient } from "@/lib/supabase";
import {
  projectJerseyConfiguredProduct,
  type JerseyConfiguredProductConsumer,
  type JerseyConfiguredProductProjection
} from "./domain";

const PRODUCT_SELECT = "id,name,nama,slug,status,status_aktif,product_type,pricing_mode,uses_configurator,minimum_order_qty,config_schema,image_url,gambar_url,image_alt,updated_at";
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
      "Jersey configurator belum dapat memuat catalog."
    );
  }

  let productQuery = client
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("status", "active")
    .eq("status_aktif", true)
    .eq("product_type", "configurable_product")
    .eq("pricing_mode", "custom_quote")
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
      message: "Jersey configured product belum tersedia.",
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
