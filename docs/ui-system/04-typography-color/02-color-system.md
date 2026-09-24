# DEBRODER Color System

## Status

**CANONICAL MODULAR SPECIFICATION**

**Authority:** `DEBRODER_MASTER_UI_SYSTEM_v1.0.md`

Dokumen ini adalah modular implementation specification. Canonical rule yang dikutip dari Master memiliki authority lebih tinggi daripada implementation guidance di dokumen ini.

## Purpose

Menetapkan philosophy neutral-dominant dengan Hijau DEBRODER sebagai signature, tanpa memfinalkan HEX yang belum dipilih.

## Scope

Brand accent, CTA, active, selected, focus, surface accents, dan neutral dominance.

## Canonical Rules

### Master §16 — COLOR PHILOSOPHY

DEBRODER menggunakan:

```text
±85–90% neutral
±10–15% Hijau DEBRODER
```

Neutral:

- putih;
- off-white;
- near-black;
- gray;
- border neutral.

Hijau DEBRODER:

- brand signature;
- CTA utama;
- active state;
- selected state;
- focus;
- micro-accent;
- badge positif tertentu;
- icon accent;
- underline/indicator;
- branding.

Prinsip:

> Green is DEBRODER's signature, not its wallpaper.

Hijau tidak boleh memenuhi semua card atau semua background.

## Detailed Specification

### Domain intent

- 85–90% neutral dan 10–15% Hijau DEBRODER adalah philosophy canonical.
- Green is signature, not wallpaper.
- HEX resmi dan scale 50–950 tetap open decision.
- Semantic status tidak boleh rancu dengan brand accent.

### Interpretation contract

- Setiap nilai angka, range, urutan, ratio, terminology, hierarchy, atau status yang berasal dari Master dipertahankan apa adanya.
- Penjelasan tambahan di dokumen ini adalah **IMPLEMENTATION GUIDANCE** kecuali dinyatakan sebagai CANONICAL/OWNER LOCKED dari Source Mapping.
- Existing implementation tidak boleh digunakan untuk menurunkan canonical target.
- Jika kebutuhan implementasi memerlukan detail yang belum ada di Master, detail tersebut tidak boleh disamarkan sebagai final decision.
- Cross-domain value harus dirujuk ke canonical owner-nya agar tidak membentuk source-of-truth ganda.

## Dimensions

- Color accent ditempatkan pada hierarchy yang tepat dan tidak menyebar sebagai wallpaper.

- Nilai dimension yang tersedia pada Canonical Rules di atas bersifat authoritative untuk domain ini.
- Jika tidak ada numeric dimension pada source, dokumen ini tidak membuat numeric value baru.
- Fixed, minimum, maximum, range, dan fluid behavior tidak boleh saling dipertukarkan tanpa source.

## Layout Contract

- Color accent ditempatkan pada hierarchy yang tepat dan tidak menyebar sebagai wallpaper.

## Typography Contract

- Text warna semantic harus tetap readable di atas surface terkait.

## Color / Surface Contract

- Pisahkan brand, positive status, warning, information, error, dan unfinished semantics.
- Jangan memfinalkan HEX yang belum dikunci.

## Interaction Contract

- Hover/focus/selected treatment boleh dijelaskan secara semantic, tetapi nilai final yang belum ada tidak diinvent.

## Responsive Contract

- Color meaning tidak berubah antar viewport.

## State Contract

- State harus memiliki cue selain warna bila makna penting.

## Accessibility Contract

- Contrast wajib cukup dan status tidak hanya bergantung pada hue.

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

- 85–90% neutral dan 10–15% Hijau DEBRODER adalah philosophy canonical.
- Green is signature, not wallpaper.
- HEX resmi dan scale 50–950 tetap open decision.
- Semantic status tidak boleh rancu dengan brand accent.
- Tidak ada numeric value canonical yang berubah dari Master.
- Tidak ada OWNER LOCKED decision yang direinterpretasikan.
- Tidak ada BELUM FINAL decision yang difinalkan sebagai canonical.
- State dan accessibility requirements dipertimbangkan bila domain memiliki interaksi.
- Source Mapping tersedia dan dapat dilacak ke Master.

## Related Documents

- [Semantic Color Contract](03-semantic-color.md)
- [Open Decisions Registry](../00-governance/03-open-decisions.md)

## Source Mapping

- Master §16 — COLOR PHILOSOPHY
- Master §17 — MASTER COLOR STATUS
- Master §18 — CATATAN MASTER WARNA
- Master §86 — STATUS MASTER
