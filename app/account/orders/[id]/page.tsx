import type { Metadata } from "next";
import { AccountOrderDetail } from "@/components/customer-account/AccountOrderDetail";

export const metadata: Metadata = {
  title: "Detail Pesanan | DEBRODER",
  robots: { index: false, follow: false }
};

export default async function AccountOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AccountOrderDetail id={id} />;
}
