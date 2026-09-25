# Density & Surface System

## Status

**CANONICAL MODULAR SPECIFICATION**

**Authority:** `DEBRODER_MASTER_UI_SYSTEM_v1.0.md`

Dokumen ini adalah modular implementation specification. Canonical rule yang dikutip dari Master memiliki authority lebih tinggi daripada implementation guidance di dokumen ini.

## Purpose

Mengatur background, surface hierarchy, elevation, dan density sesuai konteks editorial, commerce, serta dense operational UI.

## Scope

Background public commerce, hero/campaign, surface 0–3, card/container density, customer, dan admin.

## Canonical Rules

### Master §10 — BACKGROUND SYSTEM

## Public Commerce

Mayoritas:

```text
putih / off-white
```

## Hero / Campaign

```text
L1 = photography / visual
L2 = readability veil bila diperlukan
L3 = headline + CTA
```

Veil hanya untuk menjaga keterbacaan.

Jangan membuat overlay dekoratif tanpa fungsi.

### Master §11 — SURFACE SYSTEM

## Surface 0 — Canvas

Untuk:

- landing page;
- katalog;
- detail produk;
- content page.

## Surface 1 — Commerce

Untuk:

- informasi produk;
- keranjang;
- pembayaran;
- akun.

Visual:

- solid/hampir solid;
- border subtle;
- shadow minimal.

## Surface 2 — Elevated

Untuk:

- Quick Cart;
- dropdown;
- drawer filter;
- sticky summary;
- popover.

## Surface 3 — Modal

Untuk:

- dialog;
- konfirmasi;
- high-focus task.

### Master §12 — DENSITY SYSTEM

## Editorial

Lebih banyak whitespace, gambar dominan, teks lebih besar.

Untuk:

- Beranda;
- campaign;
- brand story.

## Commerce

Medium density.

Untuk:

- Katalog;
- Detail Produk;
- Keranjang;
- Pembayaran.

## Dense

Lebih rapat dan informatif.

Untuk:

- Akun;
- Riwayat Pesanan;
- Admin;
- inventory;
- table.

Dense density dilarang digunakan pada Beranda.

## Detailed Specification

### Domain intent

- Whitespace dan surface dipakai untuk hierarchy, bukan dekorasi.
- Editorial memiliki whitespace lebih luas; commerce medium density; dense hanya area informasi/operasional.
- Dense dilarang pada Beranda.
- Veil pada hero hanya untuk readability.

### Interpretation contract

- Setiap nilai angka, range, urutan, ratio, terminology, hierarchy, atau status yang berasal dari Master dipertahankan apa adanya.
- Penjelasan tambahan di dokumen ini adalah **IMPLEMENTATION GUIDANCE** kecuali dinyatakan sebagai CANONICAL/OWNER LOCKED dari Source Mapping.
- Existing implementation tidak boleh digunakan untuk menurunkan canonical target.
- Jika kebutuhan implementasi memerlukan detail yang belum ada di Master, detail tersebut tidak boleh disamarkan sebagai final decision.
- Cross-domain value harus dirujuk ke canonical owner-nya agar tidak membentuk source-of-truth ganda.

## Dimensions

- Gunakan surface untuk grouping semantik, bukan membungkus setiap elemen.

- Nilai dimension yang tersedia pada Canonical Rules di atas bersifat authoritative untuk domain ini.
- Jika tidak ada numeric dimension pada source, dokumen ini tidak membuat numeric value baru.
- Fixed, minimum, maximum, range, dan fluid behavior tidak boleh saling dipertukarkan tanpa source.

## Layout Contract

- Gunakan surface untuk grouping semantik, bukan membungkus setiap elemen.
- Whitespace tetap separator utama pada editorial/commerce.

## Typography Contract

- Surface tidak boleh memaksa hierarchy typography baru yang bertentangan dengan global scale.

## Color / Surface Contract

- Surface 0–3 menggunakan neutral/solid or near-solid behavior sesuai Master.
- Readability veil hanya bila dibutuhkan.

## Interaction Contract

- Elevated surface digunakan untuk quick cart/dropdown/drawer/sticky summary/popover; modal untuk high-focus task.

## Responsive Contract

- Density dapat berubah sesuai domain, bukan semata ukuran viewport.
- Dense tetap dilarang pada Beranda.

## State Contract

- Elevation tidak boleh menjadi satu-satunya indikator state.
- Error/caution mengikuti semantic color, bukan shadow.

## Accessibility Contract

- Surface contrast harus cukup untuk membedakan content tanpa mengandalkan shadow besar.

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

- Whitespace dan surface dipakai untuk hierarchy, bukan dekorasi.
- Editorial memiliki whitespace lebih luas; commerce medium density; dense hanya area informasi/operasional.
- Dense dilarang pada Beranda.
- Veil pada hero hanya untuk readability.
- Tidak ada numeric value canonical yang berubah dari Master.
- Tidak ada OWNER LOCKED decision yang direinterpretasikan.
- Tidak ada BELUM FINAL decision yang difinalkan sebagai canonical.
- State dan accessibility requirements dipertimbangkan bila domain memiliki interaksi.
- Source Mapping tersedia dan dapat dilacak ke Master.

## Related Documents

- [Radius, Border & Shadow](../02-tokens/03-radius-border-shadow.md)
- [Hero & Editorial System](../06-public-commerce/02-hero-editorial.md)
- [Admin Density & Typography](../08-admin/05-admin-density.md)

## Source Mapping

- Master §10 — BACKGROUND SYSTEM
- Master §11 — SURFACE SYSTEM
- Master §12 — DENSITY SYSTEM
- Master §22 — CARD DIMENSIONS
- Master §49 — ADMIN CARD
- Master §53 — SHADOW SYSTEM
