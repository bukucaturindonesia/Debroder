import { redirect } from "next/navigation";
import { PUBLIC_ROUTES } from "@/lib/public-routes";

export default function JacketsShopAliasPage() {
  redirect(PUBLIC_ROUTES.jackets);
}
