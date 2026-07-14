"use client";

import { FormEvent, type ReactNode, useMemo, useState } from "react";
import { createSupabaseClient, ORDER_UPLOADS_BUCKET } from "@/lib/supabase";
import type { Product } from "@/lib/types";
import { formatRupiah } from "@/lib/url";

type CreatedOrder = {
  id: string;
  orderNumber: string;
  phone: string;
  submissionId: string;
};

function fileExtension(file: File) {
  const fromName = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "");
  return fromName || (file.type === "application/pdf" ? "pdf" : "jpg");
}

function validateFile(file: File, proof = false) {
  const types = proof
    ? ["image/jpeg", "image/png", "image/webp"]
    : ["image/jpeg", "image/png", "image/webp", "application/pdf"];
  if (!types.includes(file.type)) return proof ? "Bukti bayar harus JPG, PNG, atau WebP." : "Desain harus JPG, PNG, WebP, atau PDF.";
  if (file.size > 10 * 1024 * 1024) return "Ukuran file maksimal 10 MB.";
  return "";
}

function productReference(product: Product) {
  return product.id || product.slug || product.nama;
}

export function OrderForm({ products, initialProduct }: { products: Product[]; initialProduct?: string }) {
  const initial = products.find((product) => product.id === initialProduct || product.slug === initialProduct || product.nama === initialProduct);
  const [productId, setProductId] = useState(initial ? productReference(initial) : "");
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [color, setColor] = useState("");
  const [size, setSize] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState<"pickup" | "shipping">("pickup");
  const [shippingAddress, setShippingAddress] = useState("");
  const [designFile, setDesignFile] = useState<File | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [createdOrder, setCreatedOrder] = useState<CreatedOrder | null>(null);
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [uploadingProof, setUploadingProof] = useState(false);

  const selectedProduct = useMemo(() => products.find((product) => productReference(product) === productId), [productId, products]);
  const estimatedTotal = Number(selectedProduct?.price || selectedProduct?.harga || selectedProduct?.base_price || 0) * quantity;

  async function uploadFile(file: File, submissionId: string, kind: "design" | "payment") {
    const supabase = createSupabaseClient();
    if (!supabase) throw new Error("Supabase belum dikonfigurasi.");
    const path = `${submissionId}/${kind}-${Date.now()}.${fileExtension(file)}`;
    const { error } = await supabase.storage.from(ORDER_UPLOADS_BUCKET).upload(path, file, {
      contentType: file.type,
      cacheControl: "3600",
      upsert: false
    });
    if (error) throw error;
    return path;
  }

  async function submitOrder(event: FormEvent) {
    event.preventDefault();
    if (!selectedProduct) {
      setStatus("Pilih produk terlebih dahulu.");
      return;
    }
    if (deliveryMethod === "shipping" && shippingAddress.trim().length < 8) {
      setStatus("Alamat pengiriman wajib diisi.");
      return;
    }
    if (designFile) {
      const message = validateFile(designFile);
      if (message) {
        setStatus(message);
        return;
      }
    }

    const supabase = createSupabaseClient();
    if (!supabase) return;
    setSubmitting(true);
    setStatus("Menyimpan pesanan...");
    const submissionId = crypto.randomUUID();

    try {
      const designPath = designFile ? await uploadFile(designFile, submissionId, "design") : null;
      const { data, error } = await supabase.rpc("create_public_order", {
        p_customer_name: customerName.trim(),
        p_customer_phone: phone.trim(),
        p_customer_email: email.trim(),
        p_product_id: selectedProduct.id || null,
        p_product_name: selectedProduct.nama,
        p_color: color.trim(),
        p_size: size.trim(),
        p_quantity: quantity,
        p_customer_notes: notes.trim(),
        p_design_file_path: designPath,
        p_delivery_method: deliveryMethod,
        p_shipping_address: shippingAddress.trim()
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (!row?.created_order_id || !row?.created_order_number) throw new Error("Nomor pesanan tidak diterima.");
      setCreatedOrder({ id: row.created_order_id, orderNumber: row.created_order_number, phone: phone.trim(), submissionId });
      setStatus("Pesanan berhasil dibuat dan masuk ke Order Management.");
    } catch (error) {
      setStatus(`Pesanan belum berhasil disimpan: ${error instanceof Error ? error.message : "coba lagi"}`);
    } finally {
      setSubmitting(false);
    }
  }

  async function submitPaymentProof(event: FormEvent) {
    event.preventDefault();
    if (!createdOrder || !proofFile) {
      setStatus("Pilih bukti pembayaran terlebih dahulu.");
      return;
    }
    const validation = validateFile(proofFile, true);
    if (validation) {
      setStatus(validation);
      return;
    }

    const supabase = createSupabaseClient();
    if (!supabase) return;
    setUploadingProof(true);
    setStatus("Mengupload bukti pembayaran...");
    try {
      const proofPath = await uploadFile(proofFile, createdOrder.submissionId, "payment");
      const { error } = await supabase.rpc("submit_public_payment_proof", {
        p_order_id: createdOrder.id,
        p_order_number: createdOrder.orderNumber,
        p_customer_phone: createdOrder.phone,
        p_payment_proof_path: proofPath
      });
      if (error) throw error;
      setStatus("Bukti pembayaran terkirim dan menunggu verifikasi admin.");
      setProofFile(null);
    } catch (error) {
      setStatus(`Bukti pembayaran gagal dikirim: ${error instanceof Error ? error.message : "coba lagi"}`);
    } finally {
      setUploadingProof(false);
    }
  }

  if (createdOrder) {
    return (
      <div className="grid gap-6 lg:grid-cols-[1fr_.8fr]">
        <section className="bg-white p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[.18em] text-brand-green">Pesanan diterima</p>
          <h1 className="mt-3 text-3xl font-semibold">{createdOrder.orderNumber}</h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-brand-charcoal/65">Simpan nomor pesanan ini. Tim DEBRODER akan memeriksa detail dan menghubungi nomor WhatsApp yang Anda isi.</p>
          {status ? <p role="status" className="mt-5 bg-brand-offWhite p-4 text-sm font-semibold">{status}</p> : null}
        </section>
        <form onSubmit={submitPaymentProof} className="bg-white p-6 sm:p-8">
          <h2 className="text-xl font-semibold">Bayar / Upload Bukti Bayar</h2>
          <p className="mt-2 text-sm leading-6 text-brand-charcoal/60">Pembayaran masih manual. Transfer sesuai arahan tim, lalu upload bukti agar admin dapat memverifikasi.</p>
          <label className="mt-5 grid gap-2 text-sm font-semibold">Bukti transfer<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setProofFile(event.target.files?.[0] || null)} className="min-h-11 rounded-lg border border-brand-softGray p-3 font-normal" /></label>
          <button disabled={uploadingProof || !proofFile} className="mt-5 min-h-11 w-full bg-black px-6 text-sm font-semibold text-white hover:bg-black/75 disabled:opacity-50">{uploadingProof ? "Mengupload..." : "Upload Bukti Bayar"}</button>
        </form>
      </div>
    );
  }

  return (
    <form onSubmit={submitOrder} className="grid gap-6 lg:grid-cols-[1fr_.72fr]">
      <section className="bg-white p-6 sm:p-8">
        <h1 className="text-3xl font-semibold">Form Pemesanan</h1>
        <p className="mt-2 text-sm leading-6 text-brand-charcoal/60">Isi kebutuhan produk. Pesanan langsung masuk ke Order Management DEBRODER.</p>
        {status ? <p role="status" className="mt-5 bg-brand-offWhite p-4 text-sm font-semibold">{status}</p> : null}
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Field label="Nama customer"><input required value={customerName} onChange={(event) => setCustomerName(event.target.value)} /></Field>
          <Field label="Nomor WhatsApp"><input required inputMode="tel" value={phone} onChange={(event) => setPhone(event.target.value)} /></Field>
          <Field label="Email (opsional)"><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></Field>
          <Field label="Produk"><select required value={productId} onChange={(event) => { setProductId(event.target.value); setColor(""); setSize(""); }}><option value="">Pilih produk</option>{products.map((product) => <option key={productReference(product)} value={productReference(product)}>{product.nama}</option>)}</select></Field>
          <Field label="Warna"><input list="order-colors" value={color} onChange={(event) => setColor(event.target.value)} /><datalist id="order-colors">{(selectedProduct?.color_tags || []).map((item) => <option key={item} value={item} />)}</datalist></Field>
          <Field label="Ukuran"><input list="order-sizes" value={size} onChange={(event) => setSize(event.target.value)} /><datalist id="order-sizes">{(selectedProduct?.size_tags || []).map((item) => <option key={item} value={item} />)}</datalist></Field>
          <Field label="Jumlah"><input required type="number" min="1" max="10000" value={quantity} onChange={(event) => setQuantity(Math.max(1, Number(event.target.value)))} /></Field>
          <Field label="Upload desain (opsional)"><input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(event) => setDesignFile(event.target.files?.[0] || null)} /></Field>
          <div className="sm:col-span-2"><Field label="Catatan"><textarea rows={4} value={notes} onChange={(event) => setNotes(event.target.value)} /></Field></div>
          <Field label="Metode ambil/kirim"><select value={deliveryMethod} onChange={(event) => setDeliveryMethod(event.target.value as "pickup" | "shipping")}><option value="pickup">Ambil di store</option><option value="shipping">Kirim ke alamat</option></select></Field>
          {deliveryMethod === "shipping" ? <Field label="Alamat pengiriman"><textarea required rows={3} value={shippingAddress} onChange={(event) => setShippingAddress(event.target.value)} /></Field> : null}
        </div>
      </section>

      <aside className="self-start bg-[#0b2017] p-6 text-white sm:p-8 lg:sticky lg:top-24">
        <p className="text-xs font-semibold uppercase tracking-[.18em] text-white/55">Ringkasan</p>
        <h2 className="mt-4 text-2xl font-semibold">{selectedProduct?.nama || "Pilih produk"}</h2>
        <dl className="mt-6 grid gap-3 text-sm"><div className="flex justify-between gap-4"><dt className="text-white/60">Harga satuan</dt><dd>{selectedProduct ? formatRupiah(selectedProduct.price ?? selectedProduct.harga ?? selectedProduct.base_price) || "Konfirmasi admin" : "-"}</dd></div><div className="flex justify-between gap-4"><dt className="text-white/60">Jumlah</dt><dd>{quantity}</dd></div><div className="flex justify-between gap-4 border-t border-white/15 pt-4 text-base font-semibold"><dt>Estimasi</dt><dd>{estimatedTotal ? formatRupiah(estimatedTotal) : "Konfirmasi admin"}</dd></div></dl>
        <button disabled={submitting || !selectedProduct} className="mt-7 min-h-12 w-full bg-white px-6 text-sm font-semibold text-black disabled:opacity-50">{submitting ? "Menyimpan..." : "Buat Pesanan"}</button>
        <p className="mt-4 text-xs leading-5 text-white/50">Harga final, ongkir, dan detail produksi akan dikonfirmasi oleh admin.</p>
      </aside>
    </form>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="grid gap-2 text-sm font-semibold [&_input]:min-h-11 [&_input]:rounded-lg [&_input]:border [&_input]:border-brand-softGray [&_input]:px-4 [&_select]:min-h-11 [&_select]:rounded-lg [&_select]:border [&_select]:border-brand-softGray [&_select]:bg-white [&_select]:px-4 [&_textarea]:rounded-lg [&_textarea]:border [&_textarea]:border-brand-softGray [&_textarea]:p-4 [&_input]:font-normal [&_select]:font-normal [&_textarea]:font-normal">{label}{children}</label>;
}
