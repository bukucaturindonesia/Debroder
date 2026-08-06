import type { Metadata } from "next";
import { PublicShell } from "@/components/PublicPage";
import { ForgotPasswordForm } from "@/components/customer-auth/CustomerAuthForms";

export const metadata: Metadata = {
  title: "Lupa Kata Sandi | DEBRODER",
  robots: { index: false, follow: false }
};

export default function ForgotPasswordPage() {
  return <PublicShell><ForgotPasswordForm /></PublicShell>;
}
