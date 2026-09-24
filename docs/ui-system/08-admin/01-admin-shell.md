# Admin Shell

## Status

**CANONICAL MODULAR SPECIFICATION**

**Authority:** `DEBRODER_MASTER_UI_SYSTEM_v1.0.md`

Dokumen ini adalah modular implementation specification. Canonical rule yang dikutip dari Master memiliki authority lebih tinggi daripada implementation guidance di dokumen ini.

## Purpose

Menetapkan fixed sidebar, topbar, page header, optional context/KPI, toolbar, dan content region admin.

## Scope

Seluruh admin DEBRODER.

## Canonical Rules

### Master §47 — ADMIN SHELL

Canonical:

```text
Fixed Sidebar
Topbar
Page Header
Context / KPI bila perlu
Toolbar
Content
```

Sidebar:

```text
248px
```

Collapsed:

```text
72px
```

Topbar:

```text
64px
```

Sidebar tidak ikut scroll bersama konten panjang.

## Detailed Specification

### Domain intent

- Sidebar 248px, collapsed 72px, topbar 64px.
- Sidebar tidak ikut scroll bersama long content.
- Admin tidak diperlakukan seperti landing page.
- KPI digunakan bila perlu, bukan default cardification.

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

## Admin Shell Anatomy

```text
Fixed Sidebar (248px / collapsed 72px)
+
Topbar (64px)
+
Scrollable Page Content
    ├── Page Header
    ├── Context / KPI bila perlu
    ├── Toolbar
    └── Content
```

## Scroll Ownership

Sidebar tidak ikut scroll bersama long page content. Ini adalah canonical behavior. Content region harus dapat scroll tanpa kehilangan orientation navigation.

## Page Header

Admin Page H1 mengikuti admin typography, bukan landing H1. Header memberi current task/context, bukan marketing headline.

## Context / KPI

KPI hanya `bila perlu`. Jangan membuat setiap metric menjadi card karena shell memberi slot KPI.

## Toolbar

Toolbar menampung actions/filter/context controls sesuai page task. Primary action harus jelas dan rare actions tidak boleh setara visual.

## Responsive Boundary

Complete admin responsive matrix belum final. Jangan mengunci sidebar mobile behavior baru sebagai OWNER LOCKED. Gunakan Master Responsive Contract dan daftar unresolved behavior pada Open Decisions.

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

- Sidebar 248px, collapsed 72px, topbar 64px.
- Sidebar tidak ikut scroll bersama long content.
- Admin tidak diperlakukan seperti landing page.
- KPI digunakan bila perlu, bukan default cardification.
- Tidak ada numeric value canonical yang berubah dari Master.
- Tidak ada OWNER LOCKED decision yang direinterpretasikan.
- Tidak ada BELUM FINAL decision yang difinalkan sebagai canonical.
- State dan accessibility requirements dipertimbangkan bila domain memiliki interaksi.
- Source Mapping tersedia dan dapat dilacak ke Master.

## Related Documents

- [Admin Navigation](02-admin-navigation.md)
- [Admin Cards](03-admin-cards.md)
- [Admin Tables](04-admin-tables.md)

## Source Mapping

- Master §4 — MASTER UI LAYER SYSTEM
- Master §12 — DENSITY SYSTEM
- Master §47 — ADMIN SHELL
- Master §54 — PAGE FOCUS RULE
- Master §61 — STICKY / Z-INDEX SYSTEM
- Master §76 — MASTER COMPONENT DIMENSION MATRIX
