import { formatRupiah } from "@/lib/money";
import { getQuotationStatusLabel } from "@/lib/quotation-status-copy";
import { listQuotationDrafts } from "@/lib/supabase/quotations";

export const metadata = {
  title: "Draft Penawaran Harga"
};

export default async function AdminQuotationsPage() {
  const quotations = await listQuotationDrafts();

  return (
    <div className="page-shell">
      <div className="stack" style={{ marginBottom: 24 }}>
        <p className="eyebrow">Admin</p>
        <h1 className="product-title">Draft Penawaran Harga</h1>
      </div>

      {quotations.length === 0 ? (
        <div className="notice">
          Belum ada draft penawaran harga.
        </div>
      ) : (
        <div className="admin-panel">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nomor</th>
                <th>Kontak</th>
                <th>Produk</th>
                <th>Jumlah</th>
                <th>Total</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {quotations.map((quotation) => (
                <tr key={quotation.id}>
                  <td>
                    <strong>{quotation.quotationNumber}</strong>
                    <br />
                    <span className="muted">
                      {formatDate(quotation.createdAt)}
                    </span>
                  </td>
                  <td>
                    {quotation.contactName ?? "-"}
                    <br />
                    <span className="muted">
                      {quotation.contactWhatsapp ?? "-"}
                    </span>
                  </td>
                  <td>
                    {quotation.configurationSnapshot.product_name}
                    <br />
                    <span className="muted">
                      {quotation.configurationSnapshot.items.length} kombinasi
                    </span>
                  </td>
                  <td>{quotation.totalQuantity} pcs</td>
                  <td>
                    {formatRupiah(quotation.estimatedTotal)}
                    {quotation.requiresReview ? (
                      <>
                        <br />
                        <span className="muted">Perlu diperiksa</span>
                      </>
                    ) : null}
                  </td>
                  <td>{getQuotationStatusLabel(quotation.status, "admin")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function formatDate(value: string): string {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

