import type { Metadata } from "next";
import { AccountAddresses } from "@/components/customer-account/AccountAddresses";

export const metadata: Metadata = {
  title: "Alamat Saya | DEBRODER",
  robots: { index: false, follow: false }
};

export default function AccountAddressesPage() {
  return <AccountAddresses />;
}
