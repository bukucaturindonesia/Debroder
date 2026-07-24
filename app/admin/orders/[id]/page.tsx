import { OrderCommandCenterAdmin } from "@/components/admin/OrderCommandCenterAdmin";
import { OrderDetailAdmin } from "@/components/admin/OrderDetailAdmin";

export default async function OrderDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ view?: string | string[] }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const view = Array.isArray(query.view) ? query.view[0] : query.view;
  return view === "full"
    ? <OrderDetailAdmin orderId={id} />
    : <OrderCommandCenterAdmin orderId={id} />;
}
