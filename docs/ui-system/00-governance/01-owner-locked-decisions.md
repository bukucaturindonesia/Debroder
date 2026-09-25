# OWNER LOCKED Decisions Registry

## Status

**OWNER LOCKED REGISTRY**

## Purpose

Registry keputusan yang tidak boleh diinterpretasikan ulang oleh implementasi, test lama, atau preferensi lokal.

## Authority

`DEBRODER_MASTER_UI_SYSTEM_v1.0.md`

Registry ini tidak menciptakan lock baru. Ia mengumpulkan lock yang secara eksplisit ada di Master dan status list Master §86.

## Explicit OWNER LOCKED / FINAL Sections

### PDP CTA — Master §32

Desktop:

```text
[ Beli Sekarang ] [ Custom ]

[      Tambah ke Keranjang      ]
```

Baris 1:

```text
1fr 1fr
gap: 12px
height: 52px
```

Baris 2:

```text
width: 100%
height: 48–52px
margin-top: 12px
```

Urutan tidak boleh diubah:

1. Beli Sekarang
2. Custom
3. Tambah ke Keranjang

### Bahasa UI — Master §69

Seluruh UI pengguna dan admin menggunakan Bahasa Indonesia penuh.

Hindari campuran Inggris jika ada padanan Indonesia yang jelas.

Istilah teknis yang boleh dipakai jika diperlukan dan konsisten:

- SKU;
- URL;
- API;
- SEO.

Contoh canonical:

```text
Checkout            → Pembayaran
Add to Cart         → Tambah ke Keranjang
Buy Now             → Beli Sekarang
Wishlist            → Favorit / Daftar Favorit
Order History       → Riwayat Pesanan
Account             → Akun
Address             → Alamat
Search              → Cari
Sort                → Urutkan
Out of Stock        → Stok Habis
In Stock            → Tersedia
Draft               → Draf
Published           → Dipublikasikan
Pending             → Menunggu
Cancelled           → Dibatalkan
```

Satu fungsi harus menggunakan satu istilah yang sama di seluruh sistem.

### Footnote / Unfinished — Master §71

Jika ada tugas, section, komponen, atau fitur yang belum selesai:

- wajib diberi penanda merah;
- boleh menggunakan ikon caution;
- copy harus jelas;
- tidak boleh disamarkan sebagai status normal.

Contoh:

```text
⚠ Belum selesai — menunggu integrasi pembayaran.
```

```text
* Belum Final — foto produk masih belum lengkap.
```

Merah hanya digunakan untuk attention/caution/unfinished/error.

## Master Status — §86

Sudah LOCKED:

- Bahasa Indonesia penuh;
- Geist Sans;
- Hijau sebagai identitas DEBRODER;
- Merah sebagai caution/unfinished/error/attention;
- master layout;
- container;
- grid;
- spacing;
- typography;
- card family;
- product card;
- product ratio 4:5;
- navbar;
- controls;
- PDP CTA;
- responsive principles;
- state system;
- density;
- surface;
- z-index;
- admin shell;
- customer shell;
- QA direction.

Belum final:

- HEX Hijau DEBRODER resmi;
- full color scale 50–950;
- final icon family;
- complete responsive matrix per component;
- final photography/media behavior matrix.

Semua bagian yang belum final harus ditandai caution merah di implementasi/review.

## High-Impact Locked Contracts

Berdasarkan §86 dan canonical sections terkait, reviewer wajib memperlakukan item berikut sebagai target yang tidak boleh diturunkan oleh existing code:

- Bahasa Indonesia penuh.
- Geist Sans.
- Hijau sebagai identitas DEBRODER.
- Merah sebagai caution/unfinished/error/attention.
- Master layout, container, grid, spacing, typography.
- Card family dan ProductCard.
- Product ratio 4:5.
- Navbar dan controls.
- PDP CTA.
- Responsive principles dan state system.
- Density dan surface.
- Z-index.
- Admin shell dan customer shell.
- QA direction.

Untuk nilai/detail exact, buka canonical domain owner melalui Source Mapping atau Coverage Matrix. Registry ini tidak menggantikan domain specification.

## Governance Rules

- Existing implementation atau test lama tidak boleh menurunkan keputusan locked.
- Recommendation yang tidak dinyatakan locked tidak boleh dinaikkan statusnya secara sepihak.
- Open decisions yang tercantum §86 tetap open dan tidak termasuk locked final values.
- Jika implementation conflict ditemukan, catat sebagai IMPLEMENTATION GAP.

## Acceptance Criteria

- Semua explicit locked sections tetap utuh.
- Daftar status locked §86 tidak dipersempit.
- Tidak ada open decision yang dipresentasikan sebagai locked final.
- PDP CTA order/layout tidak berubah.
- Language dan unfinished semantic contract tidak berubah.

## Related Documents

- [UI System Charter](00-ui-system-charter.md)
- [Open Decisions Registry](03-open-decisions.md)
- [PDP](../06-public-commerce/05-pdp.md)
- [Language System](../12-content/01-language-system.md)
- [Unfinished & Caution](../12-content/03-unfinished-caution.md)

## Source Mapping

- Master §23 — PRODUCT CARD — CANONICAL
- Master §32 — PDP CTA — FINAL / LOCKED
- Master §69 — BAHASA UI — FINAL / LOCKED
- Master §71 — FOOTNOTE / UNFINISHED RULE — LOCKED
- Master §80 — MASTER PHOTOGRAPHY & MEDIA
- Master §85 — URUTAN PENGERJAAN CANONICAL
- Master §86 — STATUS MASTER
