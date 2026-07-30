import { redirect } from "next/navigation";
import { PUBLIC_ROUTES } from "@/lib/public-routes";

export default function HeadwearShopAliasPage() {
  redirect(PUBLIC_ROUTES.headwear);
}
