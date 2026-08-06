import type { ReactNode } from "react";
import { PublicShell } from "@/components/PublicPage";
import { CustomerAccountFrame } from "@/components/customer-account/CustomerAccountFrame";

export default function CustomerAccountLayout({ children }: { children: ReactNode }) {
  return <PublicShell><CustomerAccountFrame>{children}</CustomerAccountFrame></PublicShell>;
}
