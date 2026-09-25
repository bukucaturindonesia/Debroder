# UI Copy

## Status

**CANONICAL MODULAR SPECIFICATION**

**Authority:** `DEBRODER_MASTER_UI_SYSTEM_v1.0.md`

Dokumen ini adalah modular implementation specification. Canonical rule yang dikutip dari Master memiliki authority lebih tinggi daripada implementation guidance di dokumen ini.

## Purpose

Mengatur copy singkat, jelas, action-oriented, consistent, dan Indonesian-first.

## Scope

CTA, labels, helper text, empty/error/success copy, forms, commerce actions.

## Canonical Rules

### Master §70 — UI COPY RULE

Gunakan copy singkat dan jelas.

Contoh:

```text
Beli Sekarang
Tambah ke Keranjang
Pilih Ukuran
Pilih Warna
Lihat Detail
Simpan Alamat
Lanjut ke Pembayaran
```

Dilarang menggunakan istilah backend/database di UI publik.

## Detailed Specification

### Domain intent

- Canonical examples dipertahankan.
- UI copy tidak menampilkan istilah backend/database.
- Error/success mengikuti feedback contract.
- Spec ini tidak menciptakan marketing campaign copy.

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

- Canonical examples dipertahankan.
- UI copy tidak menampilkan istilah backend/database.
- Error/success mengikuti feedback contract.
- Spec ini tidak menciptakan marketing campaign copy.
- Tidak ada numeric value canonical yang berubah dari Master.
- Tidak ada OWNER LOCKED decision yang direinterpretasikan.
- Tidak ada BELUM FINAL decision yang difinalkan sebagai canonical.
- State dan accessibility requirements dipertimbangkan bila domain memiliki interaksi.
- Source Mapping tersedia dan dapat dilacak ke Master.

## Related Documents

- [Language System — OWNER LOCKED](01-language-system.md)
- [Error, Warning & Success](../10-system-states/03-error-warning-success.md)

## Source Mapping

- Master §65 — ERROR SYSTEM
- Master §66 — SUCCESS SYSTEM
- Master §69 — BAHASA UI — FINAL / LOCKED
- Master §70 — UI COPY RULE
- Master §71 — FOOTNOTE / UNFINISHED RULE — LOCKED
