# Customer Shell

## Status

**CANONICAL MODULAR SPECIFICATION**

**Authority:** `DEBRODER_MASTER_UI_SYSTEM_v1.0.md`

Dokumen ini adalah modular implementation specification. Canonical rule yang dikutip dari Master memiliki authority lebih tinggi daripada implementation guidance di dokumen ini.

## Purpose

Menetapkan desktop sidebar/content split dan mobile transformation untuk area pelanggan.

## Scope

Akun, alamat, riwayat pesanan, transaksi, favorit, dan other customer views.

## Canonical Rules

### Master §46 — CUSTOMER AREA

Desktop:

```text
sidebar: 220–240px
content: flexible
```

Mobile:

```text
sidebar → menu/drawer
```

Density:

```text
Commerce / Dense
```

## Detailed Specification

### Domain intent

- Desktop sidebar 220–240px dan content flexible.
- Mobile sidebar berubah menjadi menu/drawer.
- Density Commerce/Dense.
- Customer shell tetap bagian dari satu visual system DEBRODER, bukan dashboard terpisah.

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

- Desktop sidebar 220–240px dan content flexible.
- Mobile sidebar berubah menjadi menu/drawer.
- Density Commerce/Dense.
- Customer shell tetap bagian dari satu visual system DEBRODER, bukan dashboard terpisah.
- Tidak ada numeric value canonical yang berubah dari Master.
- Tidak ada OWNER LOCKED decision yang direinterpretasikan.
- Tidak ada BELUM FINAL decision yang difinalkan sebagai canonical.
- State dan accessibility requirements dipertimbangkan bila domain memiliki interaksi.
- Source Mapping tersedia dan dapat dilacak ke Master.

## Related Documents

- [Account Layout](02-account-layout.md)
- [Customer Responsive Contract](04-customer-responsive.md)

## Source Mapping

- Master §4 — MASTER UI LAYER SYSTEM
- Master §12 — DENSITY SYSTEM
- Master §46 — CUSTOMER AREA
- Master §54 — PAGE FOCUS RULE
- Master §61 — STICKY / Z-INDEX SYSTEM
- Master §79 — MASTER RESPONSIVE CONTRACT
