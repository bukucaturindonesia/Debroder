# DEBRODER Visual Asset Audit Report

## Ringkasan keputusan

Audit awal selesai pada 2026-10-22 di branch `codex/unified-category-hero-v1`, HEAD `726c69267a400730e894881d8ae8a44b32921b76`. Temuan dicatat tanpa mengubah desain, aplikasi, aset, database, migration, atau konfigurasi. Status proyek tetap v1.2 DEEP AUDIT & STABILIZATION, **NO-GO / NOT COMPLETE**.

`public/` menyimpan 242 file visual: 85 SVG dan 157 raster. Semua raster lolos pemeriksaan decode dan semua SVG berhasil diparse. Pemeriksaan ini tidak membuktikan tampilan browser, media remote CMS, izin pakai, crop, warna, atau kecepatan.

## Yang diperiksa

- Aset statis di `public/`, termasuk ukuran pixel, format, ukuran file, dan keterbacaan.
- Rujukan media dan komponen di `app/`, `components/`, `src/`, dan `lib/`.
- Alur media Hero dari `components/HeroSlider.tsx`, fallback media, CategoryHero, katalog, foto produk statis, logo, icon, size guide, dan metadata sosial.
- Aturan Landing Page Blueprint, Commerce Blueprint, Admin Blueprint FROZEN, Master State, Handoff, dan Issue Register.

Inventaris lengkap 242 file berada di [ASSET_INVENTORY.md](ASSET_INVENTORY.md).

## Hasil inventaris

- **Foto sumber produk:** 101 file di `public/product-images-source/`: CREWNEK 12, HODDIE 16, KAOS LENGAN PANJANG 34, KAOS POLOS 21, POLO 18.
- **Foto produk publik lokal:** 21 file di `public/products/`: 12 Crewneck front, 7 foto primary apparel lain, dan 2 foto Jersey custom.
- Sebagian besar foto sumber berukuran 421×551 px; satu 384×503 px. Rasionya sekitar 0,763–0,764, sedangkan blueprint menetapkan master produk/kategori 4:5 (2000×2500 px).
- Dua gambar Jersey custom berukuran 828×1472 px (rasio 0,562). Contact sheet menunjukkan foto snapshot jersey pada model dengan logo/tulisan pihak ketiga yang tampak; sumber, hak pakai, dan kecocokan terhadap produk DEBRODER belum dibuktikan. Jangan gunakan untuk campaign atau pemetaan produk kanonis sebelum owner/PIM mengonfirmasi.
- Belum ditemukan master Hero/kampanye atau foto lifestyle kategori sebagai aset statis yang jelas. Hero dan kategori mengambil media CMS; aset CMS yang sedang publish belum dibaca.
- Fallback Hero memakai `public/debroder/social-preview.png` (1080×1080), bukan ukuran master Hero desktop 1920×900 atau mobile 1080×1350.
- Logo 7680×4427 hitam dan putih masing-masing 675,212 dan 722,331 bytes. Keduanya kandidat optimasi jika pemeriksaan consumer menunjukkan file sebesar itu dikirim di halaman publik.
- Ada salinan identik antar-sebagian foto sumber dan foto publik. Duplikasi dipetakan di inventaris. Tidak ada aset yang dihapus atau dipindah.
- Repo tidak menetapkan provenance/lisensi foto sumber. Issue `MEDIA-001` tetap meminta konfirmasi owner/PIM untuk 89 file yang identitasnya ambigu; audit statis ini tidak mengubah pemetaan tersebut.

## Pemetaan tampilan dan kebutuhan

| Prioritas | Area / aset yang dibutuhkan | Keadaan yang terlihat dari checkout | Kebutuhan / pemilik |
|---|---|---|---|
| P0 | Hero homepage desktop dan mobile | Media dikelola CMS; fallback lokal adalah square social preview | CMS memilih artwork resmi desktop 1920×900 dan mobile 1080×1350; verifikasi crop dan CTA sebelum publish |
| P0 | Lima visual kategori: Kaos Polos, Sablon DTF, Jersey, Jaket & Hoodie, Headwear | CategoryHero menerima URL media CMS; tidak ada bukti lokal media live/published | CMS mengelola foto lifestyle unik 4:5 per kategori; kartu tetap tanpa harga/overlay sesuai blueprint landing |
| P1 | Featured, Trending/editorial, Fresh Drop dan banner kampanye | CMS mengelola campaign; Fresh Drop mengambil kebenaran produk dari PIM | Audit setiap artwork yang benar-benar published; desktop/mobile artwork terpisah bila komposisi membutuhkan |
| P1 | Galeri produk dan varian warna | 21 foto statis; 101 foto sumber kecil; issue `MEDIA-001` menyebut 89 mapping ambigu | PIM memiliki maksimal empat slot per warna: depan, belakang, detail, lifestyle/samping; perlu master 2000×2500 dan pemetaan produk/warna tervalidasi |
| P1 | Jersey custom | Dua contoh 828×1472; Jersey punya jalur konfigurator sendiri | Minta foto asli/approved dan validasi tampilan khusus Jersey; jangan mengganti foto dengan mockup AI atau mengalihkan ke form generik |
| P2 | Size guide, logo, favicon, social preview | Dua size guide; logo/ikon beragam; OG image 1200×630 tersedia | Pertahankan; audit konsistensi penggunaan dan ukuran di browser setelah halaman tersedia |
| P2 | Format responsif/optimasi | Produk mayoritas WebP; logo/OG/PWA dominan PNG; Next `Image` dan `ResponsivePicture` tersedia | Optimasi per consumer setelah komposisi dan kualitas disetujui; jangan konversi massal |

## Rencana produksi yang disarankan

1. Owner/PIM menetapkan identitas produk, warna, sumber dan hak penggunaan untuk 89 foto ambigu. Pertahankan file staging dan foto lama selama review.
2. CMS/content owner memilih dan memeriksa artwork Hero desktop/mobile, lima gambar kategori, serta artwork campaign yang benar-benar aktif. Ambil dari foto DEBRODER asli atau sumber berlisensi yang dicatat.
3. Fotografer/owner menyediakan master foto nyata untuk produk aktif: 4:5, 2000×2500 px, warna sesuai produk, latar dan pencahayaan konsisten, satu sampai empat slot per warna.
4. Setelah approval komposisi, buat turunan ukuran responsif dengan Next image pipeline atau proses terukur per aset. Prioritaskan LCP Hero, lazy-load gambar di bawah fold, dan jangan mengubah warna produk.
5. QA desktop, tablet, dan mobile pada data CMS/PIM nyata; catat source, crop/focal point, alt text, broken image, layout shift, dan ukuran payload sebelum laporan PASS.

## Status quality gate

- **PASS —** file raster dapat dibaca; SVG valid secara XML; metadata aset lokal tercatat; contact sheet foto sumber dan produk lokal diperiksa untuk anomali visual yang tampak.
- **NOT TESTED —** browser desktop/tablet/mobile, kualitas visual dan warna, CMS published media, remote storage, broken image saat runtime, LCP/CLS dan responsive crop.
- **NOT DONE —** generasi atau penggantian artwork, optimasi gambar, pemetaan ulang PIM, perubahan kode/design, database/migration, deployment.
- **Risiko tersisa —** resolusi sumber produk di bawah master blueprint; 89 pemetaan foto belum dipastikan; dua JPEG Jersey menampilkan logo/tulisan pihak ketiga dengan hak pakai dan identitas belum terverifikasi; izin sumber lain tidak dicatat di repo; artwork CMS remote belum diverifikasi.
- **Keputusan —** belum ada temuan yang membenarkan perubahan visual pada audit read-only. Lanjutkan dengan review owner/PIM atas mapping dan inspeksi CMS di environment yang disepakati sebelum produksi atau perubahan.

## Batasan

Contact sheet seluruh 101 foto sumber dan 21 foto produk publik diperiksa secara visual pada resolusi thumbnail. Pemeriksaan ini menemukan anomali hak/identitas pada dua JPEG Jersey yang dicatat di atas. Tidak ada screenshot browser pada audit ini. Tidak dijalankan build, typecheck, lint, test suite, browser test, database smoke test, atau pemeriksaan deployment. Tidak ada remote/staging/production/database mutation.
