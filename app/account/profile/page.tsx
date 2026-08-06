import type { Metadata } from "next";
import { AccountProfile } from "@/components/customer-account/AccountProfile";

export const metadata: Metadata = {
  title: "Profil Pelanggan | DEBRODER",
  robots: { index: false, follow: false }
};

export default function AccountProfilePage() {
  return <AccountProfile />;
}
