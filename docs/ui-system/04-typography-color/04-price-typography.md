# Price Typography

## Status

**CANONICAL MODULAR SPECIFICATION**

**Authority:** `DEBRODER_MASTER_UI_SYSTEM_v1.0.md`

Dokumen ini adalah modular implementation specification. Canonical rule yang dikutip dari Master memiliki authority lebih tinggi daripada implementation guidance di dokumen ini.

## Purpose

Mengatur visual hierarchy harga di Product Card, PDP, Checkout Summary, dan Grand Total.

## Scope

Semua price presentation pada public commerce.

## Canonical Rules

### Master §75 — PRICE TYPOGRAPHY

Product Card:

```text
14–16px
500–600
```

PDP:

```text
20–24px
600
```

Checkout Summary:

```text
14–16px
```

Grand Total:

```text
18–22px
600
```

## Detailed Specification

### Domain intent

- Price size/weight berubah menurut konteks, bukan untuk dekorasi.
- Grand Total harus lebih kuat daripada line items tanpa menyaingi primary CTA.
- Harga harus mudah dipindai di Product Card dan PDP.

### Interpretation contract

- Setiap nilai angka, range, urutan, ratio, terminology, hierarchy, atau status yang berasal dari Master dipertahankan apa adanya.
- Penjelasan tambahan di dokumen ini adalah **IMPLEMENTATION GUIDANCE** kecuali dinyatakan sebagai CANONICAL/OWNER LOCKED dari Source Mapping.
- Existing implementation tidak boleh digunakan untuk menurunkan canonical target.
- Jika kebutuhan implementasi memerlukan detail yang belum ada di Master, detail tersebut tidak boleh disamarkan sebagai final decision.
- Cross-domain value harus dirujuk ke canonical owner-nya agar tidak membentuk source-of-truth ganda.

## Dimensions

- Line wrapping dan max width harus menjaga hierarchy dan scanability.

- Nilai dimension yang tersedia pada Canonical Rules di atas bersifat authoritative untuk domain ini.
- Jika tidak ada numeric dimension pada source, dokumen ini tidak membuat numeric value baru.
- Fixed, minimum, maximum, range, dan fluid behavior tidak boleh saling dipertukarkan tanpa source.

## Layout Contract

- Line wrapping dan max width harus menjaga hierarchy dan scanability.
- Jangan mengkompensasi layout buruk dengan mengecilkan font di luar scale.

## Typography Contract

- Gunakan exact size/line-height/weight/tracking yang canonical.
- Role typography dipilih berdasarkan information priority.

## Color / Surface Contract

- Text contrast mengikuti neutral hierarchy; color accent tidak menggantikan type hierarchy.

## Interaction Contract

- Button/link labels tetap readable pada semua states dan tidak berubah ukuran saat loading.

## Responsive Contract

- Gunakan mobile sizes yang secara eksplisit tersedia; jika tidak ada, jangan invent numeric scale baru.

## State Contract

- Disabled/error/success dapat mengubah semantic treatment tanpa mengubah typography role secara acak.

## Accessibility Contract

- Teks utama tidak di bawah minimum Master dan contrast harus cukup.

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

- Price size/weight berubah menurut konteks, bukan untuk dekorasi.
- Grand Total harus lebih kuat daripada line items tanpa menyaingi primary CTA.
- Harga harus mudah dipindai di Product Card dan PDP.
- Tidak ada numeric value canonical yang berubah dari Master.
- Tidak ada OWNER LOCKED decision yang direinterpretasikan.
- Tidak ada BELUM FINAL decision yang difinalkan sebagai canonical.
- State dan accessibility requirements dipertimbangkan bila domain memiliki interaksi.
- Source Mapping tersedia dan dapat dilacak ke Master.

## Related Documents

- [Product Card — Canonical Deep Specification](../05-components/05-product-card.md)
- [Product Detail Page — OWNER LOCKED](../06-public-commerce/05-pdp.md)
- [Checkout / Pembayaran](../06-public-commerce/07-checkout.md)

## Source Mapping

- Master §14 — TYPOGRAPHY SCALE
- Master §23 — PRODUCT CARD — CANONICAL
- Master §45 — CHECKOUT / PEMBAYARAN
- Master §75 — PRICE TYPOGRAPHY
