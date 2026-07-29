import { redirect } from "next/navigation";
import { PUBLIC_ROUTES } from "@/lib/public-routes";

export default function PlainShirtsShopAliasPage() {
  redirect(PUBLIC_ROUTES.plainShirts);
}
