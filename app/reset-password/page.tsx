import type { Metadata } from "next";
import { PublicShell } from "@/components/PublicPage";
import { ResetPasswordForm } from "@/components/customer-auth/CustomerAuthForms";

export const metadata: Metadata = {
  title: "Atur Ulang Kata Sandi | DEBRODER",
  robots: { index: false, follow: false }
};

export default function ResetPasswordPage() {
  return <PublicShell><ResetPasswordForm /></PublicShell>;
}
