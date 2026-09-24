# Cart

## Status

**CANONICAL MODULAR SPECIFICATION**

**Authority:** `DEBRODER_MASTER_UI_SYSTEM_v1.0.md`

Dokumen ini adalah modular implementation specification. Canonical rule yang dikutip dari Master memiliki authority lebih tinggi daripada implementation guidance di dokumen ini.

## Purpose

Mengatur desktop split, sticky summary, mobile single-column, item review, dan states keranjang.

## Scope

Keranjang ready-stock/commerce item review pada level UI.

## Canonical Rules

### Master §44 — CART

Desktop:

```text
7/12 atau 8/12 = item
5/12 atau 4/12 = ringkasan
```

Ringkasan pesanan:

```text
sticky desktop
```

Mobile:

```text
single column
```

## Detailed Specification

### Domain intent

- Desktop item area 7/12 atau 8/12; summary 5/12 atau 4/12.
- Summary sticky di desktop.
- Mobile single column.
- Empty cart, stock issue, loading, error, quantity/action state perlu jelas.
- Business pricing/discount rule tidak diciptakan oleh spec.

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

## Cart Anatomy

Cart adalah review surface, bukan product discovery page.

Primary structure desktop:

```text
Item Area                Order Summary
7/12 atau 8/12           5/12 atau 4/12
```

Order Summary sticky pada desktop.

Mobile menjadi single column.

## Item Presentation Contract

Setiap item harus mempertahankan kemampuan pengguna mengenali:

- produk;
- selected variant;
- quantity;
- price;
- stock issue bila ada;
- remove/delete action.

Master tidak menetapkan exact row/card dimensions untuk Cart; gunakan Commerce surface/control contracts dan jangan membuat random canonical size.

## Order Summary Contract

Summary merangkum transaksi dan menyediakan jalur ke langkah berikutnya. Summary tidak boleh menjadi card penuh dekorasi yang mengalahkan item review.

Sticky behavior membantu visibility tetapi harus:

- mengikuti z-index system;
- tidak overlap Footer/content;
- berhenti secara wajar dalam parent layout;
- tidak menutup feedback.

## Cart State Matrix

### Empty

Keranjang kosong wajib memiliki empty state dengan primary recovery action.

### Quantity loading

Quantity action tidak boleh membuat seluruh page spinner fullscreen untuk update ringan.

### Stock issue

Gunakan semantic status yang jelas. Jangan hanya mengubah warna text tanpa copy.

### Error

Error lokal item ditempatkan dekat item; page-level error hanya bila memang mempengaruhi seluruh cart.

### Mobile

Order Summary mengikuti item list dalam single-column flow. Jangan membuat desktop split dipaksa melalui horizontal scroll.

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

- Desktop item area 7/12 atau 8/12; summary 5/12 atau 4/12.
- Summary sticky di desktop.
- Mobile single column.
- Empty cart, stock issue, loading, error, quantity/action state perlu jelas.
- Business pricing/discount rule tidak diciptakan oleh spec.
- Tidak ada numeric value canonical yang berubah dari Master.
- Tidak ada OWNER LOCKED decision yang direinterpretasikan.
- Tidak ada BELUM FINAL decision yang difinalkan sebagai canonical.
- State dan accessibility requirements dipertimbangkan bila domain memiliki interaksi.
- Source Mapping tersedia dan dapat dilacak ke Master.

## Related Documents

- [Checkout / Pembayaran](07-checkout.md)
- [Empty States](../10-system-states/02-empty-states.md)

## Source Mapping

- Master §44 — CART
- Master §54 — PAGE FOCUS RULE
- Master §63 — LOADING
- Master §64 — EMPTY STATE
- Master §65 — ERROR SYSTEM
- Master §75 — PRICE TYPOGRAPHY
