import { redirect } from "next/navigation";
import { ProductDraftCreatePanel } from "@/components/admin/products/ProductDraftCreatePanel";
import {
  isValidProductWorkspaceId,
  productWorkspacePath
} from "@/lib/product-workspace";

export const dynamic = "force-dynamic";

export default async function LegacyProductCompatibilityPage({
  searchParams
}: {
  searchParams: Promise<{ productId?: string; "new"?: string }>;
}) {
  const params = await searchParams;

  if (params.productId && isValidProductWorkspaceId(params.productId)) {
    redirect(productWorkspacePath(params.productId));
  }

  if (params.new === "1") {
    return <ProductDraftCreatePanel />;
  }

  redirect("/admin/products");
}
