# Admin Navigation

## Status

**CANONICAL MODULAR SPECIFICATION**

**Authority:** `DEBRODER_MASTER_UI_SYSTEM_v1.0.md`

Dokumen ini adalah modular implementation specification. Canonical rule yang dikutip dari Master memiliki authority lebih tinggi daripada implementation guidance di dokumen ini.

## Purpose

Menjabarkan behavior navigation sidebar/topbar admin di dalam dimensions dan layer canonical.

## Scope

Expanded/collapsed sidebar, topbar actions, active state, focus, keyboard, and responsive treatment.

## Canonical Rules

Dokumen ini tidak menjadi primary owner section Master baru. Ia menyatukan konteks dari canonical domain terkait tanpa menciptakan source-of-truth kedua.

- **Master §47 — ADMIN SHELL** — dipakai sebagai contextual source; canonical ownership berada di domain primary-nya.
- **Master §61 — STICKY / Z-INDEX SYSTEM** — dipakai sebagai contextual source; canonical ownership berada di domain primary-nya.
- **Master §62 — STATE SYSTEM** — dipakai sebagai contextual source; canonical ownership berada di domain primary-nya.
- **Master §68 — ACCESSIBILITY** — dipakai sebagai contextual source; canonical ownership berada di domain primary-nya.
- **Master §69 — BAHASA UI — FINAL / LOCKED** — dipakai sebagai contextual source; canonical ownership berada di domain primary-nya.

## Detailed Specification

### Domain intent

- Sidebar width/ collapsed width berasal dari Admin Shell.
- Active/selected/focus harus berbeda dan accessible.
- Sidebar fixed tidak ikut content scroll.
- Mobile transformation detail yang belum ada tidak difinalkan.

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

- Sidebar width/ collapsed width berasal dari Admin Shell.
- Active/selected/focus harus berbeda dan accessible.
- Sidebar fixed tidak ikut content scroll.
- Mobile transformation detail yang belum ada tidak difinalkan.
- Tidak ada numeric value canonical yang berubah dari Master.
- Tidak ada OWNER LOCKED decision yang direinterpretasikan.
- Tidak ada BELUM FINAL decision yang difinalkan sebagai canonical.
- State dan accessibility requirements dipertimbangkan bila domain memiliki interaksi.
- Source Mapping tersedia dan dapat dilacak ke Master.

## Related Documents

- [Admin Shell](01-admin-shell.md)
- [Master Responsive Contract](../09-responsive/02-responsive-contract.md)

## Source Mapping

- Master §47 — ADMIN SHELL
- Master §61 — STICKY / Z-INDEX SYSTEM
- Master §62 — STATE SYSTEM
- Master §68 — ACCESSIBILITY
- Master §69 — BAHASA UI — FINAL / LOCKED
