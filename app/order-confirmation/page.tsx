import { redirect } from "next/navigation";
import { PUBLIC_ROUTES } from "@/lib/public-routes";

export default function OrderConfirmationIndexPage() {
  redirect(PUBLIC_ROUTES.tracking);
}
