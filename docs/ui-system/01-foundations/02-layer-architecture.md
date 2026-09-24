# Layer Architecture

## Status

**CANONICAL MODULAR SPECIFICATION**

**Authority:** `DEBRODER_MASTER_UI_SYSTEM_v1.0.md`

Dokumen ini adalah modular implementation specification. Canonical rule yang dikutip dari Master memiliki authority lebih tinggi daripada implementation guidance di dokumen ini.

## Purpose

Mengatur tanggung jawab layer L0–L14 dan hubungan antara canvas, navigation, sticky UI, overlay, drawer, modal, serta feedback.

## Scope

Seluruh layout dan component yang memiliki positioning atau stacking.

## Canonical Rules

### Master §4 — MASTER UI LAYER SYSTEM

Gunakan urutan layer:

```text
L0  — Viewport
L1  — Global Background
L2  — Background Treatment / Readability
L3  — Application Shell
L4  — Navigation
L5  — Page Canvas
L6  — Content Container
L7  — Section
L8  — Surface / Card
L9  — Interactive Controls
L10 — Sticky / Floating UI
L11 — Overlay
L12 — Drawer / Dropdown / Popover
L13 — Modal
L14 — Toast / System Feedback
```

Tidak boleh ada elemen melompat layer tanpa alasan UX yang jelas.

## Detailed Specification

### Domain intent

- Urutan L0–L14 tidak boleh diubah.
- Elemen tidak boleh melompat layer tanpa alasan UX.
- Layer architecture dan z-index adalah dua kontrak yang saling terkait tetapi tidak identik.
- Overlay, drawer, modal, dan toast harus mempertahankan separation of responsibility.

### Interpretation contract

- Setiap nilai angka, range, urutan, ratio, terminology, hierarchy, atau status yang berasal dari Master dipertahankan apa adanya.
- Penjelasan tambahan di dokumen ini adalah **IMPLEMENTATION GUIDANCE** kecuali dinyatakan sebagai CANONICAL/OWNER LOCKED dari Source Mapping.
- Existing implementation tidak boleh digunakan untuk menurunkan canonical target.
- Jika kebutuhan implementasi memerlukan detail yang belum ada di Master, detail tersebut tidak boleh disamarkan sebagai final decision.
- Cross-domain value harus dirujuk ke canonical owner-nya agar tidak membentuk source-of-truth ganda.

## Dimensions

- Setiap layer hanya membawa responsibility yang sesuai urutan L0–L14.

- Nilai dimension yang tersedia pada Canonical Rules di atas bersifat authoritative untuk domain ini.
- Jika tidak ada numeric dimension pada source, dokumen ini tidak membuat numeric value baru.
- Fixed, minimum, maximum, range, dan fluid behavior tidak boleh saling dipertukarkan tanpa source.

## Layout Contract

- Setiap layer hanya membawa responsibility yang sesuai urutan L0–L14.
- Content, sticky, overlay, drawer, modal, dan toast tidak boleh bercampur tanpa hierarchy.

## Typography Contract

- Layer tidak mengubah typography scale; type tetap mengikuti content role.

## Color / Surface Contract

- Readability treatment boleh digunakan pada layer background hanya untuk fungsi keterbacaan.

## Interaction Contract

- Higher interaction layers harus mengambil focus secara masuk akal dan mengembalikannya setelah ditutup.
- Overlay tidak boleh mengalahkan modal pada stacking.

## Responsive Contract

- Transformasi drawer/sticky harus tetap mempertahankan layer responsibility di mobile.
- Perubahan viewport tidak boleh menciptakan stacking shortcut.

## State Contract

- Open/closed/loading/error overlay state harus tetap berada pada layer semantik yang benar.

## Accessibility Contract

- Modal/drawer/popover harus memiliki focus behavior dan keyboard escape/closure yang layak sebagai implementation guidance.

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

- Urutan L0–L14 tidak boleh diubah.
- Elemen tidak boleh melompat layer tanpa alasan UX.
- Layer architecture dan z-index adalah dua kontrak yang saling terkait tetapi tidak identik.
- Overlay, drawer, modal, dan toast harus mempertahankan separation of responsibility.
- Tidak ada numeric value canonical yang berubah dari Master.
- Tidak ada OWNER LOCKED decision yang direinterpretasikan.
- Tidak ada BELUM FINAL decision yang difinalkan sebagai canonical.
- State dan accessibility requirements dipertimbangkan bila domain memiliki interaksi.
- Source Mapping tersedia dan dapat dilacak ke Master.

## Related Documents

- [Z-Index Contract](../02-tokens/04-z-index.md)
- [Modal, Drawer & Popover Contract](../05-components/08-modal-drawer-popover.md)
- [Sticky Behavior](../09-responsive/04-sticky-behavior.md)

## Source Mapping

- Master §4 — MASTER UI LAYER SYSTEM
- Master §10 — BACKGROUND SYSTEM
- Master §11 — SURFACE SYSTEM
- Master §61 — STICKY / Z-INDEX SYSTEM
