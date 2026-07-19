# DEBRODER UI Language Glossary

Dokumen ini membekukan istilah tampilan untuk pekerjaan standardisasi bahasa. Nilai enum, nama tabel, field API, route, dan istilah teknis source tetap tidak berubah.

| Technical key / source | Label admin | Label pelanggan | Penggunaan | Tidak boleh tampil | Pengecualian / catatan |
|---|---|---|---|---|---|
| dashboard / overview | Ringkasan | — | Halaman awal panel admin | Campuran `Dashboard` dan `Ringkasan` | Nama route tetap `/admin/dashboard` |
| order | Pesanan | Pesanan | Transaksi pelanggan | `Order` jika berarti pesanan | `order number` ditampilkan sebagai Nomor Pesanan |
| order detail | Detail Pesanan | Detail Pesanan | Rincian transaksi | Order Detail / Detail Order | — |
| under_review | Sedang Diperiksa | Pesanan sedang kami periksa | Status pesanan | Raw enum | — |
| pricing | Penetapan Harga | Penawaran sedang disiapkan | Proses harga pesanan custom | Pricing / canonical price | Harga Acuan dipakai untuk `canonical price` bila benar-benar diperlukan admin |
| awaiting_customer_approval | Menunggu Persetujuan Pelanggan | Menunggu persetujuan Anda | Persetujuan total/penawaran | Raw enum | — |
| awaiting_payment / unpaid | Menunggu Pembayaran / Belum Dibayar | Menunggu pembayaran / Belum dibayar | Status pembayaran | Raw enum | — |
| pending_verification | Menunggu Verifikasi | Pembayaran sedang diperiksa | Pemeriksaan pembayaran | Raw enum | — |
| in_production | Sedang Diproduksi | Pesanan sedang diproduksi | Produksi | Raw enum | — |
| quality_control | Pemeriksaan Kualitas | Pesanan sedang diperiksa | Pemeriksaan hasil produksi | Quality Control / QC tanpa konteks | `QC` boleh muncul pada nomor dokumen atau ruang teknis yang sangat sempit |
| packing | Sedang Dikemas | Pesanan sedang dikemas | Pengemasan | Packing sebagai status | — |
| ready_to_ship | Siap Dikirim | Pesanan siap dikirim | Pengiriman | Raw enum | — |
| completed | Selesai | Pesanan selesai | Status akhir | Raw enum | — |
| cancelled | Dibatalkan | Pesanan dibatalkan | Status akhir | Raw enum | — |
| quotation | Penawaran Harga | Penawaran Harga | Penawaran resmi | Quotation | Nama teknis source dan route tetap |
| job order | Surat Perintah Kerja | — | Dokumen produksi | Job Order | Nomor dokumen yang sudah diterbitkan tidak diubah |
| work item | Daftar Pekerjaan / Detail Pekerjaan | — | Pekerjaan produksi | Work Item | Nama teknis source dan route tetap |
| fulfillment | Pengiriman | Pengiriman | Pengiriman atau pengambilan | Fulfillment | — |
| pickup | Ambil di Toko | Ambil di Toko | Metode penyerahan | Pickup | — |
| shipping | Kurir Eksternal | Kurir Eksternal | Metode penyerahan | Shipping | — |
| product manager / PIM | Manajemen Produk | — | Pengelolaan produk | Product Manager / PIM V2 Dependency | `PIM` boleh ada pada dokumentasi teknis, bukan navigasi utama |
| product root | Produk Utama | — | Entitas produk induk di admin | Product Root | — |
| color variant | Varian Warna | Pilihan Warna | Varian produk | Color Variant | — |
| sellable SKU | SKU Siap Jual | — | Unit produk yang dapat dijual | Sellable SKU | `SKU` dipertahankan |
| role | Peran Pengguna | — | Hak pengguna admin | Role | Nilai role internal tidak diterjemahkan di database |
| permission | Hak Akses | — | Hak pengguna admin | Permission | — |
| audit log | Riwayat Aktivitas | — | Riwayat perubahan | Audit Log | Event code hanya pada diagnostik terbatas |
| media library | Galeri Media | — | Aset CMS | Media Library | — |
| page hero | Hero Halaman | — | Media/judul halaman | Page Hero | `Hero` dipertahankan sebagai istilah CMS yang umum |
| section | Bagian | — | Bagian halaman | Section | `section_key` tidak tampil pada alur utama |
| draft | Draft | — | Data belum diterbitkan | — | Istilah umum yang dipertahankan |
| published | Diterbitkan | — | Status CMS | Published | — |
| archived | Diarsipkan | — | Status arsip | Archived | — |
| preview | Pratinjau | — | Tampilan sebelum simpan/terbit | Preview tanpa konteks | `Mockup` tetap dipertahankan |
| upload | Unggah | Unggah | Pengiriman file | Upload sebagai tombol/label | Format PDF, WebP, JPG tetap |
| download | Unduh | Unduh | Mengambil file | Download sebagai tombol/label | — |
| checkout | Checkout / Lanjut ke Pembayaran | Checkout | Alur penyelesaian pesanan | Guest Checkout | Istilah checkout umum dan boleh dipertahankan |
| custom | Pesanan Custom | Pesanan Custom | Produk/pesanan khusus | Custom Project | `custom` dipertahankan bila menjadi nama kategori apparel |
| ready stock | Produk Siap Beli | Produk Siap Beli | Produk stok tersedia | — | `Ready Stock` boleh dipertahankan pada konteks industri bila ruang sempit |
| SKU / DTF / QRIS / WhatsApp / PDF / Excel / WebP / URL / email | Sama | Sama | Istilah industri/produk | — | Pengecualian resmi yang sengaja dipertahankan |

## Gaya pesan

- Tombol menggunakan kata kerja yang menyebut tindakan.
- Pesan error menjelaskan masalah dan tindakan berikutnya tanpa menampilkan exception mentah.
- Empty state memakai pola “Belum ada …” dan menjelaskan kapan data akan muncul.
- Loading state memakai “Memuat …” atau “Menyiapkan …”.
- Status yang tidak dikenali memakai fallback aman; raw enum tidak ditampilkan.
