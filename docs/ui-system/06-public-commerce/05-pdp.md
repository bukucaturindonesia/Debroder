# Product Detail Page — OWNER LOCKED

## Status

**CANONICAL / OWNER LOCKED CONTENT PRESERVED**

**Authority:** `DEBRODER_MASTER_UI_SYSTEM_v1.0.md`

Dokumen ini adalah modular implementation specification. Canonical rule yang dikutip dari Master memiliki authority lebih tinggi daripada implementation guidance di dokumen ini.

## Purpose

Menjadi canonical home untuk grid PDP, gallery, detail spacing, mobile ordering, dan OWNER LOCKED CTA hierarchy.

## Scope

Seluruh Product Detail Page ready-stock/custom entry point pada level UI; tidak mengubah business logic.

## Canonical Rules

### Master §32 — PDP CTA — FINAL / LOCKED

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

### Master §41 — PDP MASTER GRID

Desktop:

```text
Gallery: 7/12
Detail: 5/12
```

Gap:

```text
40–56px
```

Detail panel boleh sticky.

Recommended:

```text
top = tinggi navbar + 24px
```

### Master §42 — PDP GALLERY

Image ratio:

```text
4:5
```

Urutan foto LOCKED:

1. Depan
2. Belakang
3. Detail
4. Samping / Lifestyle

Desktop dapat menggunakan 2-column editorial gallery.

### Master §43 — PDP DETAIL SPACING

```text
Nama → Descriptor: 8px
Descriptor → Harga: 12px
Harga → Konten berikutnya: 24px
Antar Variant Group: 24px
Area CTA: 24–32px
Accordion: 24–32px
```

## Detailed Specification

### Domain intent

- Desktop 7/12 gallery + 5/12 detail, gap 40–56px.
- Gallery ratio 4:5 dengan urutan Depan→Belakang→Detail→Samping/Lifestyle.
- CTA owner-locked: Beli Sekarang + Custom satu baris, Tambah ke Keranjang baris kedua.
- Row 1 1fr/1fr gap 12px height 52px; row 2 full width height 48–52px margin-top 12px.
- Mobile order Gambar→Nama→Harga→Warna→Ukuran→Stok→Jumlah→CTA→Info→Pengiriman→Pendukung.
- Long storytelling tidak boleh mendahului CTA.

### Interpretation contract

- Setiap nilai angka, range, urutan, ratio, terminology, hierarchy, atau status yang berasal dari Master dipertahankan apa adanya.
- Penjelasan tambahan di dokumen ini adalah **IMPLEMENTATION GUIDANCE** kecuali dinyatakan sebagai CANONICAL/OWNER LOCKED dari Source Mapping.
- Existing implementation tidak boleh digunakan untuk menurunkan canonical target.
- Jika kebutuhan implementasi memerlukan detail yang belum ada di Master, detail tersebut tidak boleh disamarkan sebagai final decision.
- Cross-domain value harus dirujuk ke canonical owner-nya agar tidak membentuk source-of-truth ganda.

## Dimensions

- Desktop grid 7/12 + 5/12 dan gap canonical adalah contract.

- Nilai dimension yang tersedia pada Canonical Rules di atas bersifat authoritative untuk domain ini.
- Jika tidak ada numeric dimension pada source, dokumen ini tidak membuat numeric value baru.
- Fixed, minimum, maximum, range, dan fluid behavior tidak boleh saling dipertukarkan tanpa source.

## Layout Contract

- Desktop grid 7/12 + 5/12 dan gap canonical adalah contract.
- Gallery dan detail panel mempertahankan alignment; sticky detail bersifat allowed/recommended sesuai Master.

## Typography Contract

- Name, descriptor, price, variant labels, stock, quantity, CTA, accordion membentuk hierarchy scanable.
- Price memakai PDP price role.

## Color / Surface Contract

- Selected variant/focus jelas tanpa mengandalkan warna saja.
- Primary CTA green signature tanpa membuat seluruh panel hijau.

## Interaction Contract

- CTA order OWNER LOCKED tidak boleh berubah.
- Variant selection, stock, quantity, dan CTA states harus dapat dipahami sebelum action.

## Responsive Contract

- Mobile order exact dari Master harus dipertahankan.
- Long storytelling sesudah purchase-critical information.

## State Contract

- Disabled/loading/error states pada variant/CTA tidak boleh mengubah canonical order.
- Sticky mobile CTA bersifat conditional 'jika digunakan'.

## Accessibility Contract

- Size/color selectors, CTA, gallery controls, accordions, and stock/status memiliki labels/focus yang jelas.

## PDP Page Hierarchy

PDP memiliki dua tanggung jawab utama:

1. membuat pengguna memahami produk dan varian yang akan dibeli;
2. membawa pengguna menuju tindakan transaksi yang benar.

Karena itu gallery dan detail panel tidak boleh diperlakukan sebagai dua area dekoratif yang independen. Keduanya membentuk satu purchase decision surface.

### Desktop hierarchy

```text
Navbar
↓
PDP Content Container
↓
7/12 Gallery | 5/12 Detail
↓
Supporting product information
↓
Related/supporting content bila ada
```

Master tidak menentukan tambahan section sebelum atau sesudah area utama. Jangan mengarang section order baru sebagai canonical.

## Gallery Contract

Gallery menggunakan image ratio `4:5` dan urutan locked:

```text
1. Depan
2. Belakang
3. Detail
4. Samping / Lifestyle
```

Urutan ini adalah information sequence. Foto depan memberi orientasi produk, belakang melengkapi bentuk, detail membantu evaluasi material/finishing, dan samping/lifestyle memberi context tambahan.

Desktop boleh memakai `2-column editorial gallery`; kata *boleh* tidak boleh diubah menjadi kewajiban.

Gallery tidak boleh:

- mengubah ratio per foto;
- memindahkan foto detail menjadi visual pertama tanpa owner decision;
- membuat lifestyle lebih dominan daripada canonical product views;
- stretch image;
- menggunakan random crop per cell.

Detail thumbnail/zoom/crop interaction belum final dan harus dirujuk ke media open decisions.

## Detail Panel Contract

Detail panel memuat purchase-critical information. Sticky behavior diperbolehkan, dengan recommended offset:

```text
top = tinggi navbar + 24px
```

Recommended bukan locked fixed pixel karena offset bergantung pada tinggi navbar canonical yang aktif.

Detail information mengikuti spacing:

```text
Nama → Descriptor: 8px
Descriptor → Harga: 12px
Harga → Konten berikutnya: 24px
Antar Variant Group: 24px
Area CTA: 24–32px
Accordion: 24–32px
```

Spacing ini membentuk grouping. Jangan menggantinya dengan border besar, card tambahan, atau random margins.

## Variant Decision Area

Purchase-critical controls harus dapat dipindai sebelum CTA:

```text
Warna
Ukuran
Stok
Jumlah
CTA
```

### Warna

Gunakan Color Swatch contract. Visual swatch `32–36px`, hit area `44px`, selected state memiliki outer ring/border/focus indicator. Nama/status warna tidak boleh disampaikan hanya melalui hue.

### Ukuran

Size selector menggunakan `3 × 3`, XS–5XL, item height `48px`, minimum `44px`. Selected state harus jelas.

### Stok

Master menentukan hierarchy mobile menempatkan stok sebelum jumlah dan CTA. Jangan menyembunyikan stock-critical information sesudah storytelling.

### Jumlah

Master belum menetapkan visual component numeric quantity secara rinci. Jangan menciptakan dimensions baru sebagai canonical; implementation harus mengikuti global control/hit-target/state contracts.

## OWNER LOCKED CTA Contract

Tidak ada interpretasi alternatif terhadap hierarchy berikut:

```text
[ Beli Sekarang ] [ Custom ]

[      Tambah ke Keranjang      ]
```

Row pertama:

```text
1fr 1fr
gap: 12px
height: 52px
```

Row kedua:

```text
width: 100%
height: 48–52px
margin-top: 12px
```

Order:

```text
1. Beli Sekarang
2. Custom
3. Tambah ke Keranjang
```

### Forbidden interpretations

Dilarang:

- menjadikan `Tambah ke Keranjang` button pertama;
- memindahkan `Custom` ke bawah;
- membuat tiga CTA dalam satu row;
- membuat ketiganya terlihat sama-sama primary;
- mengubah order karena existing code;
- mengubah order karena test lama;
- mengubah `Beli Sekarang` menjadi secondary secara visual;
- menghilangkan `Custom` dari canonical hierarchy.

## CTA State Contract

Geometry dan order CTA tidak boleh berubah antar state.

### Disabled

Jika suatu action belum dapat dijalankan karena required selection belum lengkap, state disabled harus tetap mempertahankan slot/hierarchy. Master tidak menentukan exact disabled color; jangan mengarang token final.

### Loading

Loading tidak boleh mengganti button dengan spinner yang mengubah height/width. Label/loading treatment tetap berada dalam canonical control geometry.

### Error

Error terkait selection atau transaction initiation harus menjelaskan:

1. apa yang salah;
2. dampaknya;
3. tindakan yang harus dilakukan.

### Success

Small success feedback ditempatkan dekat action; jangan memunculkan modal besar hanya untuk success sederhana.

## Mobile PDP Contract

Canonical order:

```text
Gambar
Nama
Harga
Warna
Ukuran
Stok
Jumlah
CTA
Informasi Produk
Pengiriman
Konten Pendukung
```

Urutan ini tidak boleh direorder untuk memberi ruang storytelling.

### Mobile reasoning

- `Gambar` tetap memberi orientasi produk.
- `Nama` dan `Harga` memberi konteks keputusan segera.
- `Warna`, `Ukuran`, `Stok`, `Jumlah` adalah input transaksi.
- `CTA` muncul sesudah required purchase information.
- `Informasi Produk` dan `Pengiriman` tetap dekat purchase context.
- `Konten Pendukung` berada setelah jalur transaksi utama.

## Mobile Sticky CTA

Jika digunakan:

```text
height: 64–72px + safe area
```

Sticky CTA bersifat conditional, bukan kewajiban semua PDP. Ia tidak boleh:

- menutup content;
- menutupi error/helper text;
- menutupi selector;
- membuat dua set CTA bersaing secara visual;
- melanggar z-index system.

## PDP State Matrix

| Area | Loading | Empty/Missing | Error | Disabled | Success |
|---|---|---|---|---|---|
| Gallery | Pertahankan 4:5 footprint | Media fallback detail masih open | Jangan ubah ratio | N/A | N/A |
| Variants | Jangan shift layout | Missing choice tidak dianggap error otomatis | Error dekat group | Tampilkan non-interactive state jelas | Selection terlihat |
| Stock | Context tetap terlihat | Jangan invent stock state | Jelaskan dampak | CTA dapat mengikuti business validation di implementation | N/A |
| CTA | Geometry stabil | N/A | Recovery jelas | Hierarchy tetap | Feedback dekat action |
| Accordion/info | Skeleton mengikuti shape | Content absent ditangani tanpa fake copy | Error lokal bila perlu | N/A | N/A |

## PDP Accessibility Checklist

- CTA keyboard reachable dalam urutan yang logis.
- Size selectors mempunyai accessible names.
- Color swatches mempunyai text/label yang tidak hanya bergantung warna.
- Focus indicator terlihat.
- Gallery controls jika ada memiliki accessible labels.
- Accordion jika ada menggunakan semantic expandable control.
- Sticky CTA tidak memindahkan keyboard focus secara tidak terduga.
- Error berasosiasi dengan control/group yang bermasalah.

## Edge Cases

- Content lebih panjang dari contoh harus tetap mengikuti hierarchy, wrapping, spacing, dan alignment canonical; jangan menyelesaikannya dengan random dimensions.
- Missing/loading/error/empty content tidak boleh menyebabkan domain kehilangan page focus atau terlihat seperti halaman dari sistem lain.
- Jika existing code tidak mampu memenuhi canonical rule, catat sebagai **IMPLEMENTATION GAP** pada package audit implementasi; jangan melemahkan dokumentasi.
- Jika suatu keputusan memang belum final di Master, gunakan `⚠ BELUM FINAL — OWNER DECISION REQUIRED` dan rujuk [Open Decisions Registry](../00-governance/03-open-decisions.md).

## Do

- Gunakan canonical component, token, typography, grid, responsive pattern, state, dan language contract yang sudah tersedia.
- Pertahankan terminology penting: Premium Apparel Commerce, Editorial Retail, Commerce-first, CANONICAL, OWNER LOCKED, BELUM FINAL.
- Jaga satu primary task/information priority pada setiap page atau component.
- Gunakan cross-reference ketika rule dimiliki domain lain.

## Don't

- Jangan membuat angka, HEX, breakpoint, ratio, radius, duration, hierarchy, atau owner decision baru.
- Jangan menyesuaikan Master agar cocok dengan code lama atau test lama.
- Jangan menggunakan decorative gradient/shadow/radius/animation untuk menggantikan hierarchy.
- Jangan menghapus state/accessibility requirement hanya karena happy-path implementation terlihat benar.
- Jangan membuat copy istilah backend/database muncul di UI publik.

## Acceptance Criteria

- Desktop 7/12 gallery + 5/12 detail, gap 40–56px.
- Gallery ratio 4:5 dengan urutan Depan→Belakang→Detail→Samping/Lifestyle.
- CTA owner-locked: Beli Sekarang + Custom satu baris, Tambah ke Keranjang baris kedua.
- Row 1 1fr/1fr gap 12px height 52px; row 2 full width height 48–52px margin-top 12px.
- Mobile order Gambar→Nama→Harga→Warna→Ukuran→Stok→Jumlah→CTA→Info→Pengiriman→Pendukung.
- Long storytelling tidak boleh mendahului CTA.
- Tidak ada numeric value canonical yang berubah dari Master.
- Tidak ada OWNER LOCKED decision yang direinterpretasikan.
- Tidak ada BELUM FINAL decision yang difinalkan sebagai canonical.
- State dan accessibility requirements dipertimbangkan bila domain memiliki interaksi.
- Source Mapping tersedia dan dapat dilacak ke Master.

## Related Documents

- [Variant Selectors](../05-components/06-selectors.md)
- [Product Photography](../11-media/01-product-photography.md)
- [Mobile Commerce Priority](../09-responsive/03-mobile-commerce.md)
- [Button System](../05-components/02-buttons.md)

## Source Mapping

- Master §32 — PDP CTA — FINAL / LOCKED
- Master §35 — SIZE SELECTOR
- Master §36 — COLOR SWATCH
- Master §41 — PDP MASTER GRID
- Master §42 — PDP GALLERY
- Master §43 — PDP DETAIL SPACING
- Master §54 — PAGE FOCUS RULE
- Master §59 — MOBILE COMMERCE PRIORITY
- Master §60 — MOBILE STICKY CTA
- Master §68 — ACCESSIBILITY
- Master §75 — PRICE TYPOGRAPHY
- Master §80 — MASTER PHOTOGRAPHY & MEDIA
