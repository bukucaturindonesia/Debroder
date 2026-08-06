import type { Metadata } from "next";
import { AccountDashboard } from "@/components/customer-account/AccountDashboard";

export const metadata: Metadata = {
  title: "Akun Saya | DEBRODER",
  robots: { index: false, follow: false }
};

export default function AccountPage() {
  return <AccountDashboard />;
}
