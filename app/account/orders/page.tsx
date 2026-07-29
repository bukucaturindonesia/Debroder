import { redirect } from "next/navigation";
import { PUBLIC_ROUTES } from "@/lib/public-routes";

export default function AccountOrdersPage() {
  redirect(PUBLIC_ROUTES.account);
}
