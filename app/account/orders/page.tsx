import type { Metadata } from "next";
import { AccountOrders } from "@/components/customer-account/AccountOrders";

export const metadata: Metadata = {
  title: "Pesanan Saya | DEBRODER",
  robots: { index: false, follow: false }
};

export default function AccountOrdersPage() {
  return <AccountOrders />;
}
