"use client";

import { useState } from "react";
import { brochureWhatsappHref } from "@/src/config/site";

export function BrochureInquiry({ productName }: { productName: string }) {
  const [size, setSize] = useState("");
  const [color, setColor] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [notes, setNotes] = useState("");
  const validQuantity = /^\d+$/.test(quantity) && Number.isSafeInteger(Number(quantity)) && Number(quantity) > 0;

  return <div className="brochure-inquiry">
    <fieldset>
      <legend>Kebutuhan Anda</legend>
      <p>Isi jika sudah tahu. Pilihan ukuran dan warna akan dikonfirmasi oleh tim.</p>
      <div className="brochure-inquiry-grid">
        <label>Ukuran <input value={size} onChange={(event) => setSize(event.target.value)} placeholder="Contoh: M dan L" maxLength={120} /></label>
        <label>Warna <input value={color} onChange={(event) => setColor(event.target.value)} placeholder="Warna yang diinginkan" maxLength={120} /></label>
        <label>Jumlah <input type="number" min="1" step="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} aria-invalid={!validQuantity} aria-describedby={!validQuantity ? "quantity-error" : undefined} /></label>
      </div>
      {!validQuantity && <p id="quantity-error" role="alert">Masukkan jumlah berupa bilangan bulat minimal 1.</p>}
      <label>Catatan <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Ceritakan desain atau kebutuhan lainnya" maxLength={1000} rows={3} /></label>
    </fieldset>
    {validQuantity ? <a href={brochureWhatsappHref(productName, { size, color, quantity, notes })} className="brochure-button brochure-button-primary">Pesan via WhatsApp <span aria-hidden="true">↗</span></a> : <button disabled className="brochure-button brochure-button-primary">Pesan via WhatsApp</button>}
    <p className="brochure-inquiry-note">Membuka WhatsApp dengan rincian kebutuhan Anda. Pesan dapat ditinjau sebelum dikirim.</p>
  </div>;
}
