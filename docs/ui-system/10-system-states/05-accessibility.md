# Accessibility Contract

## Status

**CANONICAL MODULAR SPECIFICATION**

**Authority:** `DEBRODER_MASTER_UI_SYSTEM_v1.0.md`

Dokumen ini adalah modular implementation specification. Canonical rule yang dikutip dari Master memiliki authority lebih tinggi daripada implementation guidance di dokumen ini.

## Purpose

Menjadikan accessibility bagian dari setiap component/page contract, bukan appendix.

## Scope

Touch targets, focus, keyboard, labels, errors, contrast, non-color communication, reduced motion.

## Canonical Rules

### Master §68 — ACCESSIBILITY

Minimum touch target:

```text
44 × 44px
```

Wajib:

- visible focus state;
- keyboard navigation;
- accessible label pada icon-only button;
- error form yang jelas;
- kontras yang cukup;
- status tidak disampaikan hanya melalui warna.

## Detailed Specification

### Domain intent

- Minimum touch target 44×44.
- Visible focus dan keyboard navigation wajib.
- Icon-only button memiliki accessible label.
- Status tidak boleh disampaikan hanya dengan warna.
- Reduced motion wajib dihormati.

### Interpretation contract

- Setiap nilai angka, range, urutan, ratio, terminology, hierarchy, atau status yang berasal dari Master dipertahankan apa adanya.
- Penjelasan tambahan di dokumen ini adalah **IMPLEMENTATION GUIDANCE** kecuali dinyatakan sebagai CANONICAL/OWNER LOCKED dari Source Mapping.
- Existing implementation tidak boleh digunakan untuk menurunkan canonical target.
- Jika kebutuhan implementasi memerlukan detail yang belum ada di Master, detail tersebut tidak boleh disamarkan sebagai final decision.
- Cross-domain value harus dirujuk ke canonical owner-nya agar tidak membentuk source-of-truth ganda.

## Dimensions

- Hit areas tidak overlap dan focus ring tidak terpotong container.

- Nilai dimension yang tersedia pada Canonical Rules di atas bersifat authoritative untuk domain ini.
- Jika tidak ada numeric dimension pada source, dokumen ini tidak membuat numeric value baru.
- Fixed, minimum, maximum, range, dan fluid behavior tidak boleh saling dipertukarkan tanpa source.

## Layout Contract

- Hit areas tidak overlap dan focus ring tidak terpotong container.
- Reading order mengikuti visual/task order.

## Typography Contract

- Labels dan error text tetap terbaca; teks tidak disusutkan di bawah minimum.

## Color / Surface Contract

- Contrast cukup dan status punya non-color cue.

## Interaction Contract

- Keyboard navigation, accessible names, focus visibility, and logical focus order wajib.
- Icon-only control memiliki accessible label.

## Responsive Contract

- Touch target tetap minimum 44×44 dan focus order mengikuti reflow.

## State Contract

- Disabled/error/loading/selected states harus dapat dikenali selain melalui warna.

## Accessibility Contract

- Reduced motion dihormati dan semantic interaction digunakan sesuai jenis control.

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

- Minimum touch target 44×44.
- Visible focus dan keyboard navigation wajib.
- Icon-only button memiliki accessible label.
- Status tidak boleh disampaikan hanya dengan warna.
- Reduced motion wajib dihormati.
- Tidak ada numeric value canonical yang berubah dari Master.
- Tidak ada OWNER LOCKED decision yang direinterpretasikan.
- Tidak ada BELUM FINAL decision yang difinalkan sebagai canonical.
- State dan accessibility requirements dipertimbangkan bila domain memiliki interaksi.
- Source Mapping tersedia dan dapat dilacak ke Master.

## Related Documents

- [Interactive Component State Contract](../05-components/09-component-state-contract.md)
- [Motion](04-motion.md)

## Source Mapping

- Master §33 — FORM SYSTEM
- Master §35 — SIZE SELECTOR
- Master §36 — COLOR SWATCH
- Master §37 — ICON SYSTEM
- Master §62 — STATE SYSTEM
- Master §67 — MOTION
- Master §68 — ACCESSIBILITY
