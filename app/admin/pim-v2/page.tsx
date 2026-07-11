import { PimV2Client } from "@/components/admin/pim-v2-client";
import { listCustomServices } from "@/lib/supabase/custom-services";
import { listProducts } from "@/lib/supabase/products";

export const metadata = {
  title: "PIM V2"
};

export default async function PimV2Page() {
  const [products, services] = await Promise.all([
    listProducts(),
    listCustomServices({ includeInactive: true })
  ]);

  return (
    <div className="page-shell">
      <div className="stack" style={{ marginBottom: 24 }}>
        <p className="eyebrow">Admin</p>
        <h1 className="product-title">PIM V2</h1>
      </div>
      <PimV2Client products={products} services={services} />
    </div>
  );
}
