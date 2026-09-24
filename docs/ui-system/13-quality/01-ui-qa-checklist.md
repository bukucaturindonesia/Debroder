# UI QA Checklist

## Status

**CANONICAL MODULAR SPECIFICATION**

**Authority:** `DEBRODER_MASTER_UI_SYSTEM_v1.0.md`

Dokumen ini adalah modular implementation specification. Canonical rule yang dikutip dari Master memiliki authority lebih tinggi daripada implementation guidance di dokumen ini.

## Purpose

Memigrasikan seluruh Master QA UI Checklist menjadi checklist yang dapat dipakai review implementation.

## Scope

Layout, typography, color, cards, controls, commerce, responsive, language, completion, accessibility, states.

## Canonical Rules

### Master §83 — MASTER QA UI CHECKLIST

## Layout

- Apakah content mengikuti master container?
- Apakah grid benar?
- Apakah alignment benar?
- Apakah spacing menggunakan token?
- Apakah section rhythm konsisten?

## Typography

- Apakah font Geist Sans digunakan?
- Apakah heading mengikuti scale?
- Apakah metadata benar-benar secondary?
- Apakah ada random font size?

## Color

- Apakah Hijau DEBRODER hanya digunakan sebagai signature/accent?
- Apakah caution/unfinished menggunakan merah?
- Apakah status system tidak rancu dengan brand color?
- Apakah contrast cukup?

## Cards

- Apakah card sejenis konsisten?
- Apakah ratio gambar konsisten?
- Apakah padding dan radius sesuai system?
- Apakah tidak ada shadow berlebihan?

## Controls

- Apakah button height canonical?
- Apakah input height canonical?
- Apakah hit target minimum 44×44?
- Apakah state lengkap?

## Commerce

- Apakah produk menjadi fokus?
- Apakah harga mudah ditemukan?
- Apakah variant selector mudah dipahami?
- Apakah CTA jelas?
- Apakah PDP CTA mengikuti urutan LOCKED?

## Responsive

- Apakah mobile dirancang ulang, bukan hanya diperkecil?
- Apakah tidak ada overflow?
- Apakah sticky UI tidak menutup content?
- Apakah grid berubah sesuai system?

## Language

- Apakah UI 100% Bahasa Indonesia?
- Apakah ada English leak?
- Apakah istilah satu fungsi konsisten?

## Completion

- Apakah setiap unfinished item memiliki caution merah?
- Apakah tidak ada section setengah jadi yang terlihat final?

## Detailed Specification

### Domain intent

- Tidak boleh menghilangkan checklist source.
- QA digunakan setelah implementation/domain work.
- Unfinished items harus terlihat merah dan language leak harus dicek.

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

## Extended Review Procedure

Gunakan checklist Master dalam urutan review berikut agar issue tidak tertutup oleh polish visual.

### Pass 1 — Geometry

Periksa container, grid, section spacing, alignment, component dimensions, and sticky overlap.

### Pass 2 — Hierarchy

Periksa page focus, P1–P5, CTA hierarchy, price prominence, metadata weight, and content ordering.

### Pass 3 — System Consistency

Bandingkan component sejenis antar pages: radius, border, shadow, typography, image ratio, icon size, button size.

### Pass 4 — Responsive

Periksa desktop/tablet/mobile sesuai canonical transformations. Jangan hanya screenshot one viewport.

### Pass 5 — States

Periksa Loading, Empty, Error, Success, Disabled, Selected, Focus dan Unfinished/caution.

### Pass 6 — Language & Accessibility

Periksa Bahasa Indonesia, terminology leak, keyboard/focus, hit area, contrast, non-color status, and reduced motion.

### Pass 7 — Owner Quality Gate

Jalankan semua 12 pertanyaan tanpa menggabungkannya.

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

- Tidak boleh menghilangkan checklist source.
- QA digunakan setelah implementation/domain work.
- Unfinished items harus terlihat merah dan language leak harus dicek.
- Tidak ada numeric value canonical yang berubah dari Master.
- Tidak ada OWNER LOCKED decision yang direinterpretasikan.
- Tidak ada BELUM FINAL decision yang difinalkan sebagai canonical.
- State dan accessibility requirements dipertimbangkan bila domain memiliki interaksi.
- Source Mapping tersedia dan dapat dilacak ke Master.

## Related Documents

- [Owner Quality Gate](02-owner-quality-gate.md)
- [Definition of Done](03-definition-of-done.md)

## Source Mapping

- Master §68 — ACCESSIBILITY
- Master §69 — BAHASA UI — FINAL / LOCKED
- Master §71 — FOOTNOTE / UNFINISHED RULE — LOCKED
- Master §83 — MASTER QA UI CHECKLIST
