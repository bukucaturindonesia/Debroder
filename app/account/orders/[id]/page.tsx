import { redirect } from "next/navigation";
import { PUBLIC_ROUTES } from "@/lib/public-routes";

export default async function AccountOrderPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(PUBLIC_ROUTES.trackingOrder(id));
}
