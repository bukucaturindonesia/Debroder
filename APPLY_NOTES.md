# DEBRODER Final Check — Order Details & Proof Guidance

## Status remote

Migration `20260720035945_fix_pay_at_store_final_verification` sudah diterapkan ke Supabase production.
Jangan menjalankan SQL ini lagi secara manual. File migration disertakan agar repository sama dengan migration history remote.

## Perubahan UI

- Pengecekan Akhir menampilkan nilai aktual di bawah setiap label: nomor order, pelanggan, telepon, produk, varian, warna, ukuran, quantity, isi paket, jumlah paket, metode penyerahan, alamat, dan kode pos.
- Item Penyerahan Ready Stock membaca `order_items`, sehingga tidak lagi menampilkan `Pekerjaan / Data pekerjaan tidak ditemukan`.
- Pesan error final check menampilkan alasan backend yang nyata.
- Upload bukti disembunyikan selama packing/final check.
- Upload bukti baru menjadi tugas aktif menjelang serah-terima pickup atau penyelesaian pengiriman.
- Tombol terpandu mengarahkan admin ke bukti terlebih dahulu jika bukti wajib belum tersedia.

## Aturan bisnis yang dipertahankan

- `Bayar di toko` tetap berstatus belum dibayar selama persiapan dan final check.
- Uang tunai hanya dicatat ketika pelanggan benar-benar mengambil barang.
- Bukti serah-terima tetap wajib sebelum status `picked_up` atau `delivered`.
- Tidak ada order, payment, stock, fulfillment, task, atau audit data yang dihapus.

## Tindakan owner

1. Ekstrak paket ke root repository.
2. Commit seluruh file.
3. Push ke branch kerja dan cek Vercel Preview.
4. Merge ke `main` setelah Preview Ready.
5. Tidak perlu menjalankan SQL lagi.
