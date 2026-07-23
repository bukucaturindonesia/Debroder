import "server-only";

import { publicCmsStatusFilter } from "@/lib/cms-workflow";
import { getCustomDestinationForProduct } from "@/lib/custom-commerce/data";
import { readActiveProductSource, readProductBySlugSource } from "@/lib/product-read/data-access";
import { createSupabaseServerClient } from "@/lib/supabase";
import type { ProductDetailContactRow, ProductDetailPageSource } from "./source";

export async function readProductDetailPageSource(slug: string): Promise<ProductDetailPageSource> {
  const productSource = await readProductBySlugSource(slug);
  if (productSource.products.status === "unavailable") {
    return {
      status: "unavailable",
      productSource,
      relatedSource: await readActiveProductSource(),
      contact: null,
      customDestination: null
    };
  }
  if (!productSource.products.data.length) {
    return {
      status: "not_found",
      productSource,
      relatedSource: {
        products: { status: "empty", data: [] },
        variants: { status: "empty", data: [] },
        variantSizes: { status: "empty", data: [] },
        variantImages: { status: "empty", data: [] },
        sizeGuides: { status: "empty", data: [] }
      },
      contact: null,
      customDestination: null
    };
  }

  const client = createSupabaseServerClient();
  const productId = productSource.products.data[0]?.id;
  const [relatedSource, contactResult, customDestination] = await Promise.all([
    readActiveProductSource(),
    client
      ? client
          .from("contact_settings")
          .select("whatsapp_link,whatsapp_utama")
          .eq("status_aktif", true)
          .or(publicCmsStatusFilter())
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    productId ? getCustomDestinationForProduct(productId) : Promise.resolve(null)
  ]);

  return {
    status: relatedSource.products.status === "unavailable" || contactResult.error
      ? "unavailable"
      : "ready",
    productSource,
    relatedSource,
    contact: contactResult.data ? contactResult.data as ProductDetailContactRow : null,
    customDestination
  };
}
