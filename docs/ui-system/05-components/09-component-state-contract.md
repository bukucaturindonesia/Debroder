# Interactive Component State Contract

## Status

**CANONICAL MODULAR SPECIFICATION**

**Authority:** `DEBRODER_MASTER_UI_SYSTEM_v1.0.md`

Dokumen ini adalah modular implementation specification. Canonical rule yang dikutip dari Master memiliki authority lebih tinggi daripada implementation guidance di dokumen ini.

## Purpose

Menetapkan state minimum setiap interactive component dan hubungan dengan loading, feedback, motion, dan accessibility.

## Scope

Buttons, inputs, selectors, navigation actions, cards with actions, drawers, modals, and admin controls.

## Canonical Rules

### Master §62 — STATE SYSTEM

Setiap komponen interaktif wajib memiliki:

```text
Default
Hover
Focus
Aktif
Terpilih
Disabled
Loading
Error
Success
```

Jangan hanya mendesain default state.

## Detailed Specification

### Domain intent

- Default/Hover/Focus/Aktif/Terpilih/Disabled/Loading/Error/Success wajib dipertimbangkan.
- State tidak boleh hanya didesain default.
- Visual token state yang belum ada tidak boleh diinvent sebagai canonical.
- Focus dan non-color status communication wajib.

### Interpretation contract

- Setiap nilai angka, range, urutan, ratio, terminology, hierarchy, atau status yang berasal dari Master dipertahankan apa adanya.
- Penjelasan tambahan di dokumen ini adalah **IMPLEMENTATION GUIDANCE** kecuali dinyatakan sebagai CANONICAL/OWNER LOCKED dari Source Mapping.
- Existing implementation tidak boleh digunakan untuk menurunkan canonical target.
- Jika kebutuhan implementasi memerlukan detail yang belum ada di Master, detail tersebut tidak boleh disamarkan sebagai final decision.
- Cross-domain value harus dirujuk ke canonical owner-nya agar tidak membentuk source-of-truth ganda.

## Dimensions

- Feedback ditempatkan dekat source action dan menjaga content footprint bila memungkinkan.

- Nilai dimension yang tersedia pada Canonical Rules di atas bersifat authoritative untuk domain ini.
- Jika tidak ada numeric dimension pada source, dokumen ini tidak membuat numeric value baru.
- Fixed, minimum, maximum, range, dan fluid behavior tidak boleh saling dipertukarkan tanpa source.

## Layout Contract

- Feedback ditempatkan dekat source action dan menjaga content footprint bila memungkinkan.

## Typography Contract

- Pesan feedback singkat, jelas, dan Bahasa Indonesia.
- Error harus menjawab tiga pertanyaan Master.

## Color / Surface Contract

- Semantic color digunakan sesuai error/warning/info/success/unfinished contract.
- Jangan mengandalkan warna saja.

## Interaction Contract

- Retry/recovery action memiliki hierarchy yang jelas.
- Success kecil tidak menggunakan modal besar.

## Responsive Contract

- Feedback tetap terlihat dan tidak tertutup sticky UI.
- Skeleton reflow sesuai content geometry.

## State Contract

- State yang berbeda harus dapat dibedakan secara semantik dan visual.
- Loading tidak menghapus context penting.

## Accessibility Contract

- Announcements/focus/error association harus dapat dipahami assistive technology sebagai implementation guidance.

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

- Default/Hover/Focus/Aktif/Terpilih/Disabled/Loading/Error/Success wajib dipertimbangkan.
- State tidak boleh hanya didesain default.
- Visual token state yang belum ada tidak boleh diinvent sebagai canonical.
- Focus dan non-color status communication wajib.
- Tidak ada numeric value canonical yang berubah dari Master.
- Tidak ada OWNER LOCKED decision yang direinterpretasikan.
- Tidak ada BELUM FINAL decision yang difinalkan sebagai canonical.
- State dan accessibility requirements dipertimbangkan bila domain memiliki interaksi.
- Source Mapping tersedia dan dapat dilacak ke Master.

## Related Documents

- [Loading & Skeleton](../10-system-states/01-loading-skeleton.md)
- [Error, Warning & Success](../10-system-states/03-error-warning-success.md)
- [Accessibility Contract](../10-system-states/05-accessibility.md)

## Source Mapping

- Master §62 — STATE SYSTEM
- Master §63 — LOADING
- Master §65 — ERROR SYSTEM
- Master §66 — SUCCESS SYSTEM
- Master §67 — MOTION
- Master §68 — ACCESSIBILITY
