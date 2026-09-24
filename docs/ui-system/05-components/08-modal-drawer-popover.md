# Modal, Drawer & Popover Contract

## Status

**CANONICAL MODULAR SPECIFICATION**

**Authority:** `DEBRODER_MASTER_UI_SYSTEM_v1.0.md`

Dokumen ini adalah modular implementation specification. Canonical rule yang dikutip dari Master memiliki authority lebih tinggi daripada implementation guidance di dokumen ini.

## Purpose

Mendokumentasikan penggunaan elevated/overlay surfaces dan dimensions yang sudah ditetapkan Master tanpa menciptakan interaction business baru.

## Scope

Dropdown, popover, filter drawer, quick cart, confirmation dialog, dan high-focus modal.

## Canonical Rules

Dokumen ini tidak menjadi primary owner section Master baru. Ia menyatukan konteks dari canonical domain terkait tanpa menciptakan source-of-truth kedua.

- **Master §4 — MASTER UI LAYER SYSTEM** — dipakai sebagai contextual source; canonical ownership berada di domain primary-nya.
- **Master §11 — SURFACE SYSTEM** — dipakai sebagai contextual source; canonical ownership berada di domain primary-nya.
- **Master §53 — SHADOW SYSTEM** — dipakai sebagai contextual source; canonical ownership berada di domain primary-nya.
- **Master §61 — STICKY / Z-INDEX SYSTEM** — dipakai sebagai contextual source; canonical ownership berada di domain primary-nya.
- **Master §76 — MASTER COMPONENT DIMENSION MATRIX** — dipakai sebagai contextual source; canonical ownership berada di domain primary-nya.

## Detailed Specification

### Domain intent

- Modal widths dan drawer widths mengikuti dimension matrix.
- Dropdown/Drawer/Modal berada pada layer dan z-index yang sesuai.
- Mobile modal menggunakan viewport - 32px; mobile drawer 100% width.
- Elevation sesuai S1–S3 berdasarkan surface role.

### Interpretation contract

- Setiap nilai angka, range, urutan, ratio, terminology, hierarchy, atau status yang berasal dari Master dipertahankan apa adanya.
- Penjelasan tambahan di dokumen ini adalah **IMPLEMENTATION GUIDANCE** kecuali dinyatakan sebagai CANONICAL/OWNER LOCKED dari Source Mapping.
- Existing implementation tidak boleh digunakan untuk menurunkan canonical target.
- Jika kebutuhan implementasi memerlukan detail yang belum ada di Master, detail tersebut tidak boleh disamarkan sebagai final decision.
- Cross-domain value harus dirujuk ke canonical owner-nya agar tidak membentuk source-of-truth ganda.

## Dimensions

- Anatomy component harus stabil dan align dengan grid/card content edge.

- Nilai dimension yang tersedia pada Canonical Rules di atas bersifat authoritative untuk domain ini.
- Jika tidak ada numeric dimension pada source, dokumen ini tidak membuat numeric value baru.
- Fixed, minimum, maximum, range, dan fluid behavior tidak boleh saling dipertukarkan tanpa source.

## Layout Contract

- Anatomy component harus stabil dan align dengan grid/card content edge.
- Internal spacing menggunakan canonical token/range.

## Typography Contract

- Gunakan role type yang sesuai control/content; labels tidak oversize.

## Color / Surface Contract

- Brand green untuk primary/active/focus; semantic colors untuk status.
- Decorative color overload dilarang.

## Interaction Contract

- Definisikan hierarchy, target, keyboard/focus, disabled/loading behavior.
- Jangan menambahkan business workflow baru.

## Responsive Contract

- Tentukan apakah component remain/stack/full-width/drawer only jika source mendukung.
- Geometry tidak boleh pecah di mobile.

## State Contract

- Default/Hover/Focus/Aktif/Terpilih/Disabled/Loading/Error/Success dipertimbangkan sesuai relevansi.

## Accessibility Contract

- Controls mencapai minimum hit target, memiliki accessible name, dan keyboard behavior.

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

- Modal widths dan drawer widths mengikuti dimension matrix.
- Dropdown/Drawer/Modal berada pada layer dan z-index yang sesuai.
- Mobile modal menggunakan viewport - 32px; mobile drawer 100% width.
- Elevation sesuai S1–S3 berdasarkan surface role.
- Tidak ada numeric value canonical yang berubah dari Master.
- Tidak ada OWNER LOCKED decision yang direinterpretasikan.
- Tidak ada BELUM FINAL decision yang difinalkan sebagai canonical.
- State dan accessibility requirements dipertimbangkan bila domain memiliki interaksi.
- Source Mapping tersedia dan dapat dilacak ke Master.

## Related Documents

- [Layer Architecture](../01-foundations/02-layer-architecture.md)
- [Z-Index Contract](../02-tokens/04-z-index.md)
- [Component Dimensions](../02-tokens/02-dimensions.md)

## Source Mapping

- Master §4 — MASTER UI LAYER SYSTEM
- Master §11 — SURFACE SYSTEM
- Master §53 — SHADOW SYSTEM
- Master §61 — STICKY / Z-INDEX SYSTEM
- Master §76 — MASTER COMPONENT DIMENSION MATRIX
