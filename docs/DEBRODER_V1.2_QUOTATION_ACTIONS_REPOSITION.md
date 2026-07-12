# DEBRODER v1.2 — Reposition Quotation Item Actions

## Masalah sebelumnya

Tombol Tambah Produk dan Kelola Produk menggunakan posisi fixed di kanan bawah layar. Pola tersebut terasa seperti floating utility dan tidak menyatu dengan konteks Produk & Layanan.

## Perbaikan

- Tambah Produk dipindahkan ke header section Produk & Layanan.
- Kelola Produk dipindahkan ke header section yang sama.
- Tambah Produk menjadi primary action.
- Kelola Produk menjadi secondary action.
- Floating buttons di kanan bawah dihapus.
- Daftar produk diubah menjadi row editorial yang lebih bersih.
- Jumlah item ditampilkan dekat judul section.
- Modal tambah dan konfirmasi hapus tetap dipertahankan.
- Aksi hanya aktif pada quotation berstatus Draft.

## Struktur visual

```text
Produk & Layanan                     [Kelola Produk] [Tambah Produk]
1 item produk tersimpan

Kaos Cotton Combed 24s                         12 pcs
Hitam · M · SKU                              Rp504.000
```

## File

- `components/admin/QuotationDetailAdmin.tsx`
- `components/admin/QuotationProductItemPanel.tsx`
- `components/admin/QuotationItemManager.tsx`
- `app/admin/orders/quotations/[id]/page.tsx`

## Verifikasi

1. Tidak ada tombol floating di kanan bawah.
2. Tambah Produk berada di header Produk & Layanan.
3. Kelola Produk berada di samping Tambah Produk.
4. Modal tambah produk tetap bekerja.
5. Modal hapus tetap bekerja.
6. Mobile menumpuk tombol tanpa horizontal overflow.
7. Total quotation tetap diperbarui setelah tambah/hapus.

Jalankan:

```bash
pnpm run typecheck
pnpm run lint
pnpm run test
pnpm run build
```
