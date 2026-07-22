import { redirect } from "next/navigation";
import { productWorkspacePath } from "@/lib/product-workspace";

export default async function ProductWorkspaceIndexPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(productWorkspacePath(id));
}
