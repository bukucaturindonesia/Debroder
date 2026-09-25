# Admin Density & Typography

## Status

**CANONICAL MODULAR SPECIFICATION**

**Authority:** `DEBRODER_MASTER_UI_SYSTEM_v1.0.md`

Dokumen ini adalah modular implementation specification. Canonical rule yang dikutip dari Master memiliki authority lebih tinggi daripada implementation guidance di dokumen ini.

## Purpose

Mengikat typography admin ke Dense/Commerce information density agar tetap readable dan tidak seperti landing page.

## Scope

Admin headings, body, metadata, cards, tables.

## Canonical Rules

### Master §48 — ADMIN TYPOGRAPHY

```text
Page H1: 24–28px
Section H2: 18–20px
Body: 14px
Metadata: 12–13px
```

Admin tidak menggunakan heading sebesar landing page.

## Detailed Specification

### Domain intent

- Page H1 24–28px; Section H2 18–20px; body 14px; metadata 12–13px.
- Dense tidak berarti memadatkan semua whitespace sampai sulit dipindai.
- High priority dapat memakai surface/card lebih lapang tanpa mengikuti landing scale.

### Interpretation contract

- Setiap nilai angka, range, urutan, ratio, terminology, hierarchy, atau status yang berasal dari Master dipertahankan apa adanya.
- Penjelasan tambahan di dokumen ini adalah **IMPLEMENTATION GUIDANCE** kecuali dinyatakan sebagai CANONICAL/OWNER LOCKED dari Source Mapping.
- Existing implementation tidak boleh digunakan untuk menurunkan canonical target.
- Jika kebutuhan implementasi memerlukan detail yang belum ada di Master, detail tersebut tidak boleh disamarkan sebagai final decision.
- Cross-domain value harus dirujuk ke canonical owner-nya agar tidak membentuk source-of-truth ganda.

## Dimensions

- Fixed sidebar/topbar membentuk shell; page content scroll independent dari sidebar.

- Nilai dimension yang tersedia pada Canonical Rules di atas bersifat authoritative untuk domain ini.
- Jika tidak ada numeric dimension pada source, dokumen ini tidak membuat numeric value baru.
- Fixed, minimum, maximum, range, dan fluid behavior tidak boleh saling dipertukarkan tanpa source.

## Layout Contract

- Fixed sidebar/topbar membentuk shell; page content scroll independent dari sidebar.
- KPI hanya bila perlu dan table/card density dipilih sesuai task.

## Typography Contract

- Gunakan admin typography scale, bukan landing scale.

## Color / Surface Contract

- Brand green untuk active/primary/focus; semantic status tetap terpisah.

## Interaction Contract

- Toolbar/actions memiliki hierarchy yang jelas; rare row actions tidak mendominasi.
- Jangan menambah business behavior.

## Responsive Contract

- Complete admin responsive matrix belum final; jangan mengarang.
- Table overflow/stacking perlu mempertahankan usability tanpa numeric invention.

## State Contract

- Table/form/card loading/empty/error/selection/focus direncanakan.
- Sidebar active/collapsed state harus tetap jelas.

## Accessibility Contract

- Tables, nav, form controls, icon actions memiliki keyboard/focus/labels.

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

- Page H1 24–28px; Section H2 18–20px; body 14px; metadata 12–13px.
- Dense tidak berarti memadatkan semua whitespace sampai sulit dipindai.
- High priority dapat memakai surface/card lebih lapang tanpa mengikuti landing scale.
- Tidak ada numeric value canonical yang berubah dari Master.
- Tidak ada OWNER LOCKED decision yang direinterpretasikan.
- Tidak ada BELUM FINAL decision yang difinalkan sebagai canonical.
- State dan accessibility requirements dipertimbangkan bila domain memiliki interaksi.
- Source Mapping tersedia dan dapat dilacak ke Master.

## Related Documents

- [Typography System](../04-typography-color/01-typography.md)
- [Admin Cards](03-admin-cards.md)
- [Admin Tables](04-admin-tables.md)

## Source Mapping

- Master §12 — DENSITY SYSTEM
- Master §48 — ADMIN TYPOGRAPHY
- Master §49 — ADMIN CARD
- Master §50 — ADMIN TABLE
