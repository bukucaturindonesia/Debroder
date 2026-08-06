import type { Metadata } from "next";
import { Suspense } from "react";
import { PublicShell } from "@/components/PublicPage";
import { VerifyEmailForm } from "@/components/customer-auth/CustomerAuthForms";

export const metadata: Metadata = {
  title: "Verifikasi Email | DEBRODER",
  robots: { index: false, follow: false }
};

export default function VerifyEmailPage() {
  return <PublicShell><Suspense fallback={null}><VerifyEmailForm /></Suspense></PublicShell>;
}
