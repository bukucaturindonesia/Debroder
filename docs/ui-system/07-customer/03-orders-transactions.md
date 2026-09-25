# Orders & Transactions

## Status

**CANONICAL MODULAR SPECIFICATION**

**Authority:** `DEBRODER_MASTER_UI_SYSTEM_v1.0.md`

Dokumen ini adalah modular implementation specification. Canonical rule yang dikutip dari Master memiliki authority lebih tinggi daripada implementation guidance di dokumen ini.

## Purpose

Menjabarkan presentation riwayat pesanan dan transaksi pada customer area tanpa membuat order business state baru.

## Scope

Order list, transaction summary, order detail presentation, empty/loading/error/success feedback.

## Canonical Rules

Dokumen ini tidak menjadi primary owner section Master baru. Ia menyatukan konteks dari canonical domain terkait tanpa menciptakan source-of-truth kedua.

- **Master §46 — CUSTOMER AREA** — dipakai sebagai contextual source; canonical ownership berada di domain primary-nya.
- **Master §54 — PAGE FOCUS RULE** — dipakai sebagai contextual source; canonical ownership berada di domain primary-nya.
- **Master §64 — EMPTY STATE** — dipakai sebagai contextual source; canonical ownership berada di domain primary-nya.
- **Master §65 — ERROR SYSTEM** — dipakai sebagai contextual source; canonical ownership berada di domain primary-nya.
- **Master §66 — SUCCESS SYSTEM** — dipakai sebagai contextual source; canonical ownership berada di domain primary-nya.
- **Master §69 — BAHASA UI — FINAL / LOCKED** — dipakai sebagai contextual source; canonical ownership berada di domain primary-nya.
- **Master §75 — PRICE TYPOGRAPHY** — dipakai sebagai contextual source; canonical ownership berada di domain primary-nya.

## Detailed Specification

### Domain intent

- Riwayat pesanan kosong wajib memiliki empty state.
- Price/total typography mengikuti price contract.
- Status UI menggunakan Bahasa Indonesia canonical terminology.
- Rare actions tidak boleh memiliki visual weight P1.

### Interpretation contract

- Setiap nilai angka, range, urutan, ratio, terminology, hierarchy, atau status yang berasal dari Master dipertahankan apa adanya.
- Penjelasan tambahan di dokumen ini adalah **IMPLEMENTATION GUIDANCE** kecuali dinyatakan sebagai CANONICAL/OWNER LOCKED dari Source Mapping.
- Existing implementation tidak boleh digunakan untuk menurunkan canonical target.
- Jika kebutuhan implementasi memerlukan detail yang belum ada di Master, detail tersebut tidak boleh disamarkan sebagai final decision.
- Cross-domain value harus dirujuk ke canonical owner-nya agar tidak membentuk source-of-truth ganda.

## Dimensions

- Desktop sidebar/content split menjadi anchor; content page tetap memakai clear page focus.

- Nilai dimension yang tersedia pada Canonical Rules di atas bersifat authoritative untuk domain ini.
- Jika tidak ada numeric dimension pada source, dokumen ini tidak membuat numeric value baru.
- Fixed, minimum, maximum, range, dan fluid behavior tidak boleh saling dipertukarkan tanpa source.

## Layout Contract

- Desktop sidebar/content split menjadi anchor; content page tetap memakai clear page focus.
- Cards digunakan sesuai semantic role, bukan untuk semua data.

## Typography Contract

- Customer area menggunakan Commerce/Dense scale, bukan hero typography.

## Color / Surface Contract

- Brand accent menjaga continuity dengan public commerce; status memakai semantic colors.

## Interaction Contract

- Navigation, address/order/account actions mengikuti P1–P5.
- Rare actions tidak dibuat primary.

## Responsive Contract

- Sidebar → menu/drawer di mobile.
- Complete matrix yang belum final tidak diinvent.

## State Contract

- Empty/loading/error/success customer flows memakai global state system.

## Accessibility Contract

- Sidebar/menu and content actions keyboard accessible dengan touch target cukup.

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

- Riwayat pesanan kosong wajib memiliki empty state.
- Price/total typography mengikuti price contract.
- Status UI menggunakan Bahasa Indonesia canonical terminology.
- Rare actions tidak boleh memiliki visual weight P1.
- Tidak ada numeric value canonical yang berubah dari Master.
- Tidak ada OWNER LOCKED decision yang direinterpretasikan.
- Tidak ada BELUM FINAL decision yang difinalkan sebagai canonical.
- State dan accessibility requirements dipertimbangkan bila domain memiliki interaksi.
- Source Mapping tersedia dan dapat dilacak ke Master.

## Related Documents

- [Customer Shell](01-customer-shell.md)
- [Price Typography](../04-typography-color/04-price-typography.md)

## Source Mapping

- Master §46 — CUSTOMER AREA
- Master §54 — PAGE FOCUS RULE
- Master §64 — EMPTY STATE
- Master §65 — ERROR SYSTEM
- Master §66 — SUCCESS SYSTEM
- Master §69 — BAHASA UI — FINAL / LOCKED
- Master §75 — PRICE TYPOGRAPHY
