# Admin Tables

## Status

**CANONICAL MODULAR SPECIFICATION**

**Authority:** `DEBRODER_MASTER_UI_SYSTEM_v1.0.md`

Dokumen ini adalah modular implementation specification. Canonical rule yang dikutip dari Master memiliki authority lebih tinggi daripada implementation guidance di dokumen ini.

## Purpose

Menetapkan row/cell typography/density dan state requirements table admin.

## Scope

Data tables untuk produk, pesanan, inventory, customer/admin operational records pada level UI.

## Canonical Rules

### Master §50 — ADMIN TABLE

Default row:

```text
48–52px
```

Dense row:

```text
40–44px
```

Cell horizontal padding:

```text
12–16px
```

Typography:

```text
13–14px
```

Header:

```text
12–13px
600
```

## Detailed Specification

### Domain intent

- Default row 48–52px; dense 40–44px; padding 12–16px.
- Body 13–14px; header 12–13px/600.
- Selection/hover/focus/loading/empty/error perlu didesain.
- Sorting/pagination behavior presentation tidak boleh menciptakan business rule.

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

## Canonical Table Geometry

```text
Default row: 48–52px
Dense row: 40–44px
Cell horizontal padding: 12–16px
Body typography: 13–14px
Header: 12–13px / 600
```

Default vs Dense dipilih berdasarkan information density/task, bukan viewport secara otomatis.

## Table Anatomy Guidance

- Header menjelaskan column meaning.
- Row menyajikan record dengan scanability stabil.
- Selection state berbeda dari hover.
- Row actions tidak mengambil hierarchy dari primary record information.
- Sorting indicator bila digunakan harus jelas dan keyboard-accessible.
- Pagination presentation tidak menentukan server/data business behavior.

## State Matrix

### Loading

Gunakan skeleton row/cell yang mengikuti geometry table.

### Empty

Gunakan Admin Table Empty State; jangan menampilkan blank surface tanpa explanation.

### Error

Jelaskan query/load failure dan recovery action.

### Selection

Selected row tidak boleh hanya ditandai dengan perubahan warna subtle yang tidak accessible.

### Dense mode

Dense row masih harus menjaga readability dan interactive target requirement pada controls di dalam cell.

## Responsive Overflow

Master belum memberikan exact mobile table transformation. Jangan menyatakan horizontal scroll, card conversion, atau column hiding sebagai canonical owner decision tanpa source. Implementation guidance harus dipilih per table dan dapat diganti ketika responsive matrix dikunci.

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

- Default row 48–52px; dense 40–44px; padding 12–16px.
- Body 13–14px; header 12–13px/600.
- Selection/hover/focus/loading/empty/error perlu didesain.
- Sorting/pagination behavior presentation tidak boleh menciptakan business rule.
- Tidak ada numeric value canonical yang berubah dari Master.
- Tidak ada OWNER LOCKED decision yang direinterpretasikan.
- Tidak ada BELUM FINAL decision yang difinalkan sebagai canonical.
- State dan accessibility requirements dipertimbangkan bila domain memiliki interaksi.
- Source Mapping tersedia dan dapat dilacak ke Master.

## Related Documents

- [Admin Density & Typography](05-admin-density.md)
- [Loading & Skeleton](../10-system-states/01-loading-skeleton.md)

## Source Mapping

- Master §50 — ADMIN TABLE
- Master §62 — STATE SYSTEM
- Master §63 — LOADING
- Master §64 — EMPTY STATE
- Master §68 — ACCESSIBILITY
