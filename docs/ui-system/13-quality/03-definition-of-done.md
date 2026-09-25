# Definition of Done

## Status

**CANONICAL MODULAR SPECIFICATION**

**Authority:** `DEBRODER_MASTER_UI_SYSTEM_v1.0.md`

Dokumen ini adalah modular implementation specification. Canonical rule yang dikutip dari Master memiliki authority lebih tinggi daripada implementation guidance di dokumen ini.

## Purpose

Mengubah quality direction Master menjadi completion contract modular tanpa menciptakan product/business tests baru.

## Scope

Documentation/implementation review UI.

## Canonical Rules

Dokumen ini tidak menjadi primary owner section Master baru. Ia menyatukan konteks dari canonical domain terkait tanpa menciptakan source-of-truth kedua.

- **Master §83 — MASTER QA UI CHECKLIST** — dipakai sebagai contextual source; canonical ownership berada di domain primary-nya.
- **Master §84 — OWNER QUALITY RULE** — dipakai sebagai contextual source; canonical ownership berada di domain primary-nya.
- **Master §86 — STATUS MASTER** — dipakai sebagai contextual source; canonical ownership berada di domain primary-nya.
- **Master §88 — FINAL PRINCIPLE** — dipakai sebagai contextual source; canonical ownership berada di domain primary-nya.

## Detailed Specification

### Domain intent

- UI dianggap done hanya jika canonical rules, states, responsive, accessibility, language, and completion markings terpenuhi.
- OWNER LOCKED preserved dan open decisions tidak difinalkan.
- Page harus terasa bagian dari satu DEBRODER system.
- Quality gate tidak boleh dilewati karena existing implementation atau test lama.

### Interpretation contract

- Setiap nilai angka, range, urutan, ratio, terminology, hierarchy, atau status yang berasal dari Master dipertahankan apa adanya.
- Penjelasan tambahan di dokumen ini adalah **IMPLEMENTATION GUIDANCE** kecuali dinyatakan sebagai CANONICAL/OWNER LOCKED dari Source Mapping.
- Existing implementation tidak boleh digunakan untuk menurunkan canonical target.
- Jika kebutuhan implementasi memerlukan detail yang belum ada di Master, detail tersebut tidak boleh disamarkan sebagai final decision.
- Cross-domain value harus dirujuk ke canonical owner-nya agar tidak membentuk source-of-truth ganda.

## Dimensions

- QA memeriksa container, grid, alignment, spacing, dan page focus.

- Nilai dimension yang tersedia pada Canonical Rules di atas bersifat authoritative untuk domain ini.
- Jika tidak ada numeric dimension pada source, dokumen ini tidak membuat numeric value baru.
- Fixed, minimum, maximum, range, dan fluid behavior tidak boleh saling dipertukarkan tanpa source.

## Layout Contract

- QA memeriksa container, grid, alignment, spacing, dan page focus.
- Completion tidak dinilai hanya dari visual screenshot.

## Typography Contract

- Periksa Geist, scale, hierarchy, metadata, dan random sizes.

## Color / Surface Contract

- Periksa green signature, semantic red, contrast, dan open color decisions.

## Interaction Contract

- Periksa CTA hierarchy, controls, state completeness, feedback, dan accessibility.

## Responsive Contract

- Periksa mobile sebagai redesigned priority flow, sticky overlap, overflow, and grid transformations.

## State Contract

- Loading/empty/error/success/unfinished harus ditinjau, bukan hanya happy path.

## Accessibility Contract

- Minimum hit target, focus, keyboard, labels, contrast, and non-color cues menjadi acceptance gate.

## Definition of Done Checklist

Sebuah domain UI dapat disebut selesai hanya jika seluruh item yang relevan berikut terpenuhi:

### Authority

- Canonical source dirujuk.
- OWNER LOCKED preserved.
- Open decisions tidak difinalkan.
- Existing code tidak digunakan untuk menurunkan target.

### Layout

- Master container/grid/alignment digunakan.
- Spacing memakai canonical token/range.
- Tidak ada random fixed positioning sebagai primary layout.
- Sticky UI tidak menutup content.

### Typography

- Geist Sans.
- Type roles mengikuti scale.
- Tidak ada random font sizes untuk memperbaiki layout.
- Metadata tetap secondary.

### Color / Surface

- Neutral dominance terjaga.
- Hijau DEBRODER menjadi signature, bukan wallpaper.
- Merah digunakan semantik.
- Open HEX/scale belum dipalsukan.

### Components

- Canonical dimensions dipertahankan.
- ProductCard/PDP CTA tidak drift.
- States relevan lengkap.
- Controls memenuhi hit-target/accessibility.

### Responsive

- Major page memiliki responsive contract.
- Mobile bukan sekadar shrink.
- Known canonical transformations preserved.
- Unknown matrix tidak diinvent.

### Content

- UI Bahasa Indonesia.
- Terminology konsisten.
- Error/success/empty copy mengikuti feedback system.
- Unfinished item ditandai merah.

### QA

- UI QA Checklist dijalankan.
- Seluruh 12 Owner Quality Questions dinilai.
- Jika satu quality question tidak jelas: UI belum selesai.

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

- UI dianggap done hanya jika canonical rules, states, responsive, accessibility, language, and completion markings terpenuhi.
- OWNER LOCKED preserved dan open decisions tidak difinalkan.
- Page harus terasa bagian dari satu DEBRODER system.
- Quality gate tidak boleh dilewati karena existing implementation atau test lama.
- Tidak ada numeric value canonical yang berubah dari Master.
- Tidak ada OWNER LOCKED decision yang direinterpretasikan.
- Tidak ada BELUM FINAL decision yang difinalkan sebagai canonical.
- State dan accessibility requirements dipertimbangkan bila domain memiliki interaksi.
- Source Mapping tersedia dan dapat dilacak ke Master.

## Related Documents

- [OWNER LOCKED Decisions Registry](../00-governance/01-owner-locked-decisions.md)
- [UI QA Checklist](01-ui-qa-checklist.md)
- [Owner Quality Gate](02-owner-quality-gate.md)

## Source Mapping

- Master §83 — MASTER QA UI CHECKLIST
- Master §84 — OWNER QUALITY RULE
- Master §86 — STATUS MASTER
- Master §88 — FINAL PRINCIPLE
