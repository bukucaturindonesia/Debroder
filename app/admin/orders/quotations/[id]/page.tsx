import { QuotationDetailAdmin } from "@/components/admin/QuotationDetailAdmin";
import { QuotationProductItemPanel } from "@/components/admin/QuotationProductItemPanel";

export default function QuotationDetailPage() {
  return (
    <>
      <QuotationProductItemPanel />
      <QuotationDetailAdmin />
    </>
  );
}
