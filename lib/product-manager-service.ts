import type { SupabaseClient } from "@supabase/supabase-js";

export async function deleteVariantImageRow(client: SupabaseClient, imageId: string) {
  return client.from("product_variant_images").delete().eq("id", imageId);
}
