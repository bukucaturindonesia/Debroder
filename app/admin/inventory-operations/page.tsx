import { InventoryOperationsAdmin } from "@/components/admin/InventoryOperationsAdmin";

type PageProps = {
  searchParams: Promise<{ order?: string | string[] }>;
};

export default async function InventoryOperationsPage({ searchParams }: PageProps) {
  const { order } = await searchParams;
  const initialOrderId = Array.isArray(order) ? order[0] : order;
  return <InventoryOperationsAdmin initialOrderId={initialOrderId} />;
}
