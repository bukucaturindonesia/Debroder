# Z-Index Contract

## Status

**CANONICAL MODULAR SPECIFICATION**

**Authority:** `DEBRODER_MASTER_UI_SYSTEM_v1.0.md`

Dokumen ini adalah modular implementation specification. Canonical rule yang dikutip dari Master memiliki authority lebih tinggi daripada implementation guidance di dokumen ini.

## Purpose

Menetapkan stacking order yang dapat diprediksi untuk content, sticky, navigation, overlay, modal, dan system feedback.

## Scope

Semua positioned element yang berpotensi overlap.

## Canonical Rules

### Master §61 — STICKY / Z-INDEX SYSTEM

```text
Base Content     0
Sticky           10
Navbar           20
Dropdown         30
Drawer           40
Overlay          50
Modal            60
Toast            70
Critical System  80
```

Dilarang menggunakan `z-index: 999999` tanpa alasan.

## Detailed Specification

### Domain intent

- Gunakan scale 0–80 dari Master.
- Dilarang memakai z-index ekstrem sebagai shortcut.
- Z-index harus selaras dengan layer responsibility.
- Sticky content tidak boleh mengalahkan modal atau toast.

### Interpretation contract

- Setiap nilai angka, range, urutan, ratio, terminology, hierarchy, atau status yang berasal dari Master dipertahankan apa adanya.
- Penjelasan tambahan di dokumen ini adalah **IMPLEMENTATION GUIDANCE** kecuali dinyatakan sebagai CANONICAL/OWNER LOCKED dari Source Mapping.
- Existing implementation tidak boleh digunakan untuk menurunkan canonical target.
- Jika kebutuhan implementasi memerlukan detail yang belum ada di Master, detail tersebut tidak boleh disamarkan sebagai final decision.
- Cross-domain value harus dirujuk ke canonical owner-nya agar tidak membentuk source-of-truth ganda.

## Dimensions

- Gunakan token sebagai vocabulary shared; domain component hanya memilih dari contract yang ada.

- Nilai dimension yang tersedia pada Canonical Rules di atas bersifat authoritative untuk domain ini.
- Jika tidak ada numeric dimension pada source, dokumen ini tidak membuat numeric value baru.
- Fixed, minimum, maximum, range, dan fluid behavior tidak boleh saling dipertukarkan tanpa source.

## Layout Contract

- Gunakan token sebagai vocabulary shared; domain component hanya memilih dari contract yang ada.
- Fixed/min/max/fluid nature harus dipertahankan.

## Typography Contract

- Token dimensional tidak boleh diubah untuk mengakali wrapping; content/layout harus menyesuaikan sesuai contract.

## Color / Surface Contract

- Token yang belum memiliki HEX final tidak boleh diisi dengan nilai owner palsu.

## Interaction Contract

- Hit target dan control dimensions dipertahankan pada semua states.

## Responsive Contract

- Token responsive yang disebut Master digunakan pada konteksnya; jangan membuat breakpoint/value baru.

## State Contract

- Loading/disabled/focus tidak boleh mengubah canonical geometry kecuali source menyatakan.

## Accessibility Contract

- Minimum hit area dan focus requirements melengkapi token dimensions.

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

- Gunakan scale 0–80 dari Master.
- Dilarang memakai z-index ekstrem sebagai shortcut.
- Z-index harus selaras dengan layer responsibility.
- Sticky content tidak boleh mengalahkan modal atau toast.
- Tidak ada numeric value canonical yang berubah dari Master.
- Tidak ada OWNER LOCKED decision yang direinterpretasikan.
- Tidak ada BELUM FINAL decision yang difinalkan sebagai canonical.
- State dan accessibility requirements dipertimbangkan bila domain memiliki interaksi.
- Source Mapping tersedia dan dapat dilacak ke Master.

## Related Documents

- [Layer Architecture](../01-foundations/02-layer-architecture.md)
- [Sticky Behavior](../09-responsive/04-sticky-behavior.md)

## Source Mapping

- Master §4 — MASTER UI LAYER SYSTEM
- Master §19 — NAVIGATION
- Master §60 — MOBILE STICKY CTA
- Master §61 — STICKY / Z-INDEX SYSTEM
