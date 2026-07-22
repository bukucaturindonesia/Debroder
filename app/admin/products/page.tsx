import { Suspense } from "react";
import { ProductLibrary } from "@/components/admin/products/ProductLibrary";

export const dynamic = "force-dynamic";

export default function AdminProductsPage() {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse bg-brand-offWhite" />}>
      <ProductLibrary />
    </Suspense>
  );
}
