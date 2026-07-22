import type { ReactNode } from "react";
import { ProductWorkspaceShell } from "@/components/admin/products/workspace/ProductWorkspaceShell";

export const dynamic = "force-dynamic";

export default async function ProductWorkspaceLayout({
  children,
  params
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProductWorkspaceShell productId={id}>{children}</ProductWorkspaceShell>;
}
