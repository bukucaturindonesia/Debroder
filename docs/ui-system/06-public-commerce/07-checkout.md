# Checkout / Pembayaran

## Status

**CANONICAL MODULAR SPECIFICATION**

**Authority:** `DEBRODER_MASTER_UI_SYSTEM_v1.0.md`

Dokumen ini adalah modular implementation specification. Canonical rule yang dikutip dari Master memiliki authority lebih tinggi daripada implementation guidance di dokumen ini.

## Purpose

Menetapkan transaction-first hierarchy dari Identitas sampai CTA dan menjaga dekorasi tidak mengalahkan informasi pembayaran.

## Scope

Checkout/pembayaran public commerce.

## Canonical Rules

### Master §45 — CHECKOUT / PEMBAYARAN

Hierarchy:

```text
Identitas
Alamat
Pengiriman
Pembayaran
Ringkasan Pesanan
CTA
```

Dekorasi tidak boleh mengalahkan informasi transaksi.

## Detailed Specification

### Domain intent

- Hierarchy Identitas→Alamat→Pengiriman→Pembayaran→Ringkasan Pesanan→CTA wajib dipertahankan.
- Form density medium, error dekat field/section.
- Failed transaction harus menjelaskan masalah, dampak, dan tindakan.
- Grand Total memiliki price hierarchy canonical.
- Business payment behavior di luar scope UI spec.

### Interpretation contract

- Setiap nilai angka, range, urutan, ratio, terminology, hierarchy, atau status yang berasal dari Master dipertahankan apa adanya.
- Penjelasan tambahan di dokumen ini adalah **IMPLEMENTATION GUIDANCE** kecuali dinyatakan sebagai CANONICAL/OWNER LOCKED dari Source Mapping.
- Existing implementation tidak boleh digunakan untuk menurunkan canonical target.
- Jika kebutuhan implementasi memerlukan detail yang belum ada di Master, detail tersebut tidak boleh disamarkan sebagai final decision.
- Cross-domain value harus dirujuk ke canonical owner-nya agar tidak membentuk source-of-truth ganda.

## Dimensions

- Commerce content mengikuti master container/grid dan satu primary task per page.

- Nilai dimension yang tersedia pada Canonical Rules di atas bersifat authoritative untuk domain ini.
- Jika tidak ada numeric dimension pada source, dokumen ini tidak membuat numeric value baru.
- Fixed, minimum, maximum, range, dan fluid behavior tidak boleh saling dipertukarkan tanpa source.

## Layout Contract

- Commerce content mengikuti master container/grid dan satu primary task per page.
- Transaction/discovery controls tidak boleh kalah oleh dekorasi.

## Typography Contract

- Product, price, title, metadata, CTA disusun sesuai information priority.
- Marketing text tidak boleh menggeser transaksi pada mobile.

## Color / Surface Contract

- Green menandai primary/active/focus secara terkendali.
- Error/stock/unfinished memakai semantic contract.

## Interaction Contract

- CTA hierarchy harus jelas dan feedback dekat dengan action.
- Business logic di luar scope tidak diubah.

## Responsive Contract

- Mobile stack mengikuti commerce priority dan touch target.
- Sticky behavior hanya jika source mengizinkan dan tidak menutup content.

## State Contract

- Loading/empty/error/success harus direncanakan untuk path utama.
- Transaction failure harus memberikan recovery action.

## Accessibility Contract

- Form, selectors, CTAs, product actions, dan navigation keyboard/focus accessible.

## Checkout Transaction Flow

Canonical hierarchy:

```text
Identitas
↓
Alamat
↓
Pengiriman
↓
Pembayaran
↓
Ringkasan Pesanan
↓
CTA
```

Sequence ini adalah information priority transaksi. Jangan memindahkan promotional/editorial content di antara langkah-langkah tersebut.

## Section Contract

### Identitas

Mengumpulkan/menampilkan identity information yang diperlukan transaction. Detail fields berasal dari business implementation, bukan Master UI.

### Alamat

Mengelompokkan address information sebagai satu task. Error field dan helper mengikuti Form System.

### Pengiriman

Menyajikan pilihan/context pengiriman tanpa decorative treatment yang mengalahkan checkout flow.

### Pembayaran

Payment method/state harus mudah dibedakan. Master tidak menentukan provider/business logic.

### Ringkasan Pesanan

Merangkum item dan total. Price typography mengikuti Checkout Summary dan Grand Total roles.

### CTA

CTA menyelesaikan next transaction step dan menjadi primary action area.

## Form Density

Checkout menggunakan Commerce density. Whitespace cukup untuk mengelompokkan input, tetapi jangan berubah menjadi landing-page spacing.

## Failure / Retry Contract

Failed transaction harus:

1. menyebut masalah;
2. menyebut dampak pada penyelesaian pesanan;
3. memberikan tindakan yang dapat dilakukan.

Retry tidak boleh menghapus entered context bila implementation dapat mempertahankannya.

## Loading Contract

- Data ringan tidak menggunakan fullscreen spinner.
- Loading CTA mempertahankan geometry.
- Summary skeleton mengikuti content shape.
- Jangan membuat payment state terlihat sukses sebelum transaction benar-benar success dari business layer.

## Mobile Checkout

Hierarchy canonical tetap sama. Sections stack secara natural; sticky action hanya jika package implementation memutuskan berdasarkan responsive contract yang valid.

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

- Hierarchy Identitas→Alamat→Pengiriman→Pembayaran→Ringkasan Pesanan→CTA wajib dipertahankan.
- Form density medium, error dekat field/section.
- Failed transaction harus menjelaskan masalah, dampak, dan tindakan.
- Grand Total memiliki price hierarchy canonical.
- Business payment behavior di luar scope UI spec.
- Tidak ada numeric value canonical yang berubah dari Master.
- Tidak ada OWNER LOCKED decision yang direinterpretasikan.
- Tidak ada BELUM FINAL decision yang difinalkan sebagai canonical.
- State dan accessibility requirements dipertimbangkan bila domain memiliki interaksi.
- Source Mapping tersedia dan dapat dilacak ke Master.

## Related Documents

- [Form System](../05-components/03-forms.md)
- [Error, Warning & Success](../10-system-states/03-error-warning-success.md)
- [Price Typography](../04-typography-color/04-price-typography.md)

## Source Mapping

- Master §33 — FORM SYSTEM
- Master §45 — CHECKOUT / PEMBAYARAN
- Master §54 — PAGE FOCUS RULE
- Master §63 — LOADING
- Master §65 — ERROR SYSTEM
- Master §66 — SUCCESS SYSTEM
- Master §68 — ACCESSIBILITY
- Master §75 — PRICE TYPOGRAPHY
