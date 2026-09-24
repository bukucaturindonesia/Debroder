# Information Hierarchy

## Status

**CANONICAL MODULAR SPECIFICATION**

**Authority:** `DEBRODER_MASTER_UI_SYSTEM_v1.0.md`

Dokumen ini adalah modular implementation specification. Canonical rule yang dikutip dari Master memiliki authority lebih tinggi daripada implementation guidance di dokumen ini.

## Purpose

Menetapkan page focus, priority P1–P5, dan cara membentuk visual weight tanpa dekorasi berlebihan.

## Scope

Semua halaman dan component dengan beberapa informasi atau tindakan.

## Canonical Rules

### Master §54 — PAGE FOCUS RULE

Setiap halaman hanya memiliki satu tujuan utama.

Beranda:

```text
Temukan / Belanja
```

Katalog:

```text
Temukan Produk
```

Detail Produk:

```text
Pahami + Beli Produk
```

Keranjang:

```text
Tinjau Pembelian
```

Pembayaran:

```text
Selesaikan Pembelian
```

Admin Produk:

```text
Kelola Produk
```

Admin Pesanan:

```text
Kelola Pemenuhan Pesanan
```

### Master §55 — INFORMATION PRIORITY

Gunakan:

```text
P1 — Primary Action / Primary Information
P2 — Supporting Information
P3 — Secondary Action
P4 — Metadata
P5 — Rare Actions
```

P5 tidak boleh memiliki visual weight sama dengan P1.

### Master §56 — VISUAL WEIGHT

Hierarchy dibangun melalui:

```text
position
size
contrast
whitespace
weight
color
```

Bukan melalui:

```text
gradient
shadow
huge radius
excessive animation
```

## Detailed Specification

### Domain intent

- Setiap halaman memiliki satu tujuan utama.
- P1 tidak boleh bersaing dengan P5.
- Position, size, contrast, whitespace, weight, dan color membentuk hierarchy.
- Gradient, shadow, huge radius, dan excessive animation bukan pengganti hierarchy.

### Interpretation contract

- Setiap nilai angka, range, urutan, ratio, terminology, hierarchy, atau status yang berasal dari Master dipertahankan apa adanya.
- Penjelasan tambahan di dokumen ini adalah **IMPLEMENTATION GUIDANCE** kecuali dinyatakan sebagai CANONICAL/OWNER LOCKED dari Source Mapping.
- Existing implementation tidak boleh digunakan untuk menurunkan canonical target.
- Jika kebutuhan implementasi memerlukan detail yang belum ada di Master, detail tersebut tidak boleh disamarkan sebagai final decision.
- Cross-domain value harus dirujuk ke canonical owner-nya agar tidak membentuk source-of-truth ganda.

## Dimensions

- Tempatkan P1 pada area yang paling cepat ditemukan dan beri ruang cukup.

- Nilai dimension yang tersedia pada Canonical Rules di atas bersifat authoritative untuk domain ini.
- Jika tidak ada numeric dimension pada source, dokumen ini tidak membuat numeric value baru.
- Fixed, minimum, maximum, range, dan fluid behavior tidak boleh saling dipertukarkan tanpa source.

## Layout Contract

- Tempatkan P1 pada area yang paling cepat ditemukan dan beri ruang cukup.
- P5 disimpan sebagai secondary/rare actions.

## Typography Contract

- Weight/size harus mencerminkan P1–P5.
- Metadata tidak boleh menyerupai heading atau CTA utama.

## Color / Surface Contract

- Green accent digunakan selektif pada primary/active/focus roles.
- Color tidak menggantikan position/spacing hierarchy.

## Interaction Contract

- Primary action satu area harus jelas.
- Secondary dan rare actions tidak boleh memiliki visual weight sama dengan primary.

## Responsive Contract

- Saat stack di mobile, urutan content mengikuti task priority, bukan urutan dekoratif desktop.

## State Contract

- Focus/selected/error harus tetap terlihat tanpa merusak priority hierarchy.

## Accessibility Contract

- Hierarchy harus tetap dapat dipahami melalui semantics/labels, bukan visual saja.

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

- Setiap halaman memiliki satu tujuan utama.
- P1 tidak boleh bersaing dengan P5.
- Position, size, contrast, whitespace, weight, dan color membentuk hierarchy.
- Gradient, shadow, huge radius, dan excessive animation bukan pengganti hierarchy.
- Tidak ada numeric value canonical yang berubah dari Master.
- Tidak ada OWNER LOCKED decision yang direinterpretasikan.
- Tidak ada BELUM FINAL decision yang difinalkan sebagai canonical.
- State dan accessibility requirements dipertimbangkan bila domain memiliki interaksi.
- Source Mapping tersedia dan dapat dilacak ke Master.

## Related Documents

- [Button System](../05-components/02-buttons.md)
- [Product Detail Page — OWNER LOCKED](../06-public-commerce/05-pdp.md)
- [Owner Quality Gate](../13-quality/02-owner-quality-gate.md)

## Source Mapping

- Master §15 — TYPOGRAPHY PHILOSOPHY
- Master §31 — BUTTON HIERARCHY
- Master §39 — HOMEPAGE MASTER ORDER
- Master §45 — CHECKOUT / PEMBAYARAN
- Master §54 — PAGE FOCUS RULE
- Master §55 — INFORMATION PRIORITY
- Master §56 — VISUAL WEIGHT
