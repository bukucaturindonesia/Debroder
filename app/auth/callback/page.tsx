import type { Metadata } from "next";
import { Suspense } from "react";
import { PublicShell } from "@/components/PublicPage";
import { CustomerAuthCallback } from "@/components/customer-auth/CustomerAuthForms";

export const metadata: Metadata = {
  title: "Mengaktifkan Akun | DEBRODER",
  robots: { index: false, follow: false }
};

export default function CustomerAuthCallbackPage() {
  return <PublicShell><Suspense fallback={null}><CustomerAuthCallback /></Suspense></PublicShell>;
}
