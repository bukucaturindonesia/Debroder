import { OrderCommandCenterAdmin } from "@/components/admin/OrderCommandCenterAdmin";
import { OrderDetailAdmin } from "@/components/admin/OrderDetailAdmin";

export default async function OrderDetailPage({
  searchParams
}: {
  searchParams: Promise<{ view?: string | string[] }>;
}) {
  const query = await searchParams;
  const view = Array.isArray(query.view) ? query.view[0] : query.view;
  return view === "full" ? <OrderDetailAdmin /> : <OrderCommandCenterAdmin />;
}
