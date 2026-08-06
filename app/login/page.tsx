import type { Metadata } from "next";
import { Suspense } from "react";
import { PublicShell } from "@/components/PublicPage";
import { CustomerLoginForm } from "@/components/customer-auth/CustomerAuthForms";

export const metadata: Metadata = {
  title: "Masuk Pelanggan | DEBRODER",
  description: "Masuk ke akun pelanggan DEBRODER.",
  robots: { index: false, follow: false }
};

export default function LoginPage() {
  return <PublicShell><Suspense fallback={null}><CustomerLoginForm /></Suspense></PublicShell>;
}
