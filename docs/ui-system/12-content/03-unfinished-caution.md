# Unfinished & Caution — OWNER LOCKED

## Status

**CANONICAL / OWNER LOCKED CONTENT PRESERVED**

**Authority:** `DEBRODER_MASTER_UI_SYSTEM_v1.0.md`

Dokumen ini adalah modular implementation specification. Canonical rule yang dikutip dari Master memiliki authority lebih tinggi daripada implementation guidance di dokumen ini.

## Purpose

Menetapkan cara menandai pekerjaan/section/component/feature yang belum selesai agar tidak terlihat final.

## Scope

Badges, footnotes, reviews, component status, implementation/review annotations.

## Canonical Rules

### Master §71 — FOOTNOTE / UNFINISHED RULE — LOCKED

Jika ada tugas, section, komponen, atau fitur yang belum selesai:

- wajib diberi penanda merah;
- boleh menggunakan ikon caution;
- copy harus jelas;
- tidak boleh disamarkan sebagai status normal.

Contoh:

```text
⚠ Belum selesai — menunggu integrasi pembayaran.
```

```text
* Belum Final — foto produk masih belum lengkap.
```

Merah hanya digunakan untuk attention/caution/unfinished/error.

## Detailed Specification

### Domain intent

- Unfinished wajib penanda merah.
- Caution icon boleh digunakan.
- Copy harus jelas dan tidak disamarkan sebagai normal state.
- Merah hanya untuk attention/caution/unfinished/error, bukan dekorasi.

### Interpretation contract

- Setiap nilai angka, range, urutan, ratio, terminology, hierarchy, atau status yang berasal dari Master dipertahankan apa adanya.
- Penjelasan tambahan di dokumen ini adalah **IMPLEMENTATION GUIDANCE** kecuali dinyatakan sebagai CANONICAL/OWNER LOCKED dari Source Mapping.
- Existing implementation tidak boleh digunakan untuk menurunkan canonical target.
- Jika kebutuhan implementasi memerlukan detail yang belum ada di Master, detail tersebut tidak boleh disamarkan sebagai final decision.
- Cross-domain value harus dirujuk ke canonical owner-nya agar tidak membentuk source-of-truth ganda.

## Dimensions

- Copy ditempatkan sesuai information priority dan dekat dengan control/status yang dijelaskan.

- Nilai dimension yang tersedia pada Canonical Rules di atas bersifat authoritative untuk domain ini.
- Jika tidak ada numeric dimension pada source, dokumen ini tidak membuat numeric value baru.
- Fixed, minimum, maximum, range, dan fluid behavior tidak boleh saling dipertukarkan tanpa source.

## Layout Contract

- Copy ditempatkan sesuai information priority dan dekat dengan control/status yang dijelaskan.

## Typography Contract

- CTA/label/helper/error mengikuti typography role dan singkat.
- Terminologi satu fungsi konsisten.

## Color / Surface Contract

- Caution/error/unfinished copy mengikuti semantic color contract.

## Interaction Contract

- Action labels menggunakan verba yang jelas dan menghindari terminology backend.

## Responsive Contract

- Copy tidak dipotong sehingga action menjadi ambigu; wrapping ditangani tanpa mengecilkan font di luar scale.

## State Contract

- Error/success/empty/disabled language tetap Bahasa Indonesia dan sesuai state.

## Accessibility Contract

- Accessible label tidak boleh hanya berupa icon atau jargon yang tidak dipahami pengguna.

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

- Unfinished wajib penanda merah.
- Caution icon boleh digunakan.
- Copy harus jelas dan tidak disamarkan sebagai normal state.
- Merah hanya untuk attention/caution/unfinished/error, bukan dekorasi.
- Tidak ada numeric value canonical yang berubah dari Master.
- Tidak ada OWNER LOCKED decision yang direinterpretasikan.
- Tidak ada BELUM FINAL decision yang difinalkan sebagai canonical.
- State dan accessibility requirements dipertimbangkan bila domain memiliki interaksi.
- Source Mapping tersedia dan dapat dilacak ke Master.

## Related Documents

- [Semantic Color Contract](../04-typography-color/03-semantic-color.md)
- [Badges & Icons](../05-components/07-badges-icons.md)

## Source Mapping

- Master §17 — MASTER COLOR STATUS
- Master §18 — CATATAN MASTER WARNA
- Master §71 — FOOTNOTE / UNFINISHED RULE — LOCKED
- Master §74 — BADGE
- Master §86 — STATUS MASTER
