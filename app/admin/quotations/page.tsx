import { redirect } from "next/navigation";

export const metadata = {
  title: "Penawaran Harga"
};

/**
 * Compatibility route only.
 *
 * The legacy page previously loaded private quotation data through the
 * service-role client before the client-side AdminShell authorization check
 * completed. Keep the URL for compatibility, but move every request to the
 * canonical quotation workspace before any private query is executed.
 */
export default function AdminQuotationsPage() {
  redirect("/admin/orders/quotations");
}
