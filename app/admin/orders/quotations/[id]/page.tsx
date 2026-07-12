import { QuotationDetailAdmin } from "@/components/admin/QuotationDetailAdmin";
import { QuotationItemManager } from "@/components/admin/QuotationItemManager";
import { QuotationProductItemPanel } from "@/components/admin/QuotationProductItemPanel";

export default function QuotationDetailPage() {
  return (
    <>
      <QuotationProductItemPanel />
      <QuotationItemManager />
      <QuotationDetailAdmin />
    </>
  );
}
