import { CartPanel } from "@/components/cart/cart-panel";

export const metadata = {
  title: "Keranjang"
};

export default function CartPage() {
  return (
    <div className="page-shell">
      <div className="stack" style={{ marginBottom: 24 }}>
        <p className="eyebrow">Keranjang</p>
        <h1 className="product-title">Pilihan Produk</h1>
      </div>
      <CartPanel />
    </div>
  );
}

