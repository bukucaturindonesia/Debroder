import type { Metadata } from "next";
import { PublicShell } from "@/components/PublicPage";
import { CustomerRegisterForm } from "@/components/customer-auth/CustomerAuthForms";

export const metadata: Metadata = {
  title: "Daftar Pelanggan | DEBRODER",
  robots: { index: false, follow: false }
};

export default function RegisterPage() {
  return <PublicShell><CustomerRegisterForm /></PublicShell>;
}
