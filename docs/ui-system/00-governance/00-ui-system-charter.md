# UI System Charter

## Status

**CANONICAL GOVERNANCE SPECIFICATION**

**Authority:** `DEBRODER_MASTER_UI_SYSTEM_v1.0.md`

Dokumen ini adalah modular implementation specification. Canonical rule yang dikutip dari Master memiliki authority lebih tinggi daripada implementation guidance di dokumen ini.

## Purpose

Menetapkan mandat, authority, prinsip sistem, dan cara menggunakan modular specification tanpa menurunkan Master.

## Scope

Governance lintas seluruh public commerce, customer area, dan admin.

## Canonical Rules

### Master §1 — PRINSIP UTAMA

DEBRODER harus terasa sebagai satu sistem visual yang utuh.

Yang wajib konsisten:

- ukuran kartu;
- padding;
- margin;
- grid;
- ukuran font;
- line-height;
- radius;
- tombol;
- input;
- ikon;
- warna;
- state;
- responsive behavior;
- hierarchy;
- density;
- surface;
- alignment;
- feedback;
- istilah Bahasa Indonesia.

Dilarang membuat ukuran baru secara sembarangan jika token atau pola canonical sudah tersedia.

Urutan keputusan:

1. Gunakan komponen canonical yang sudah ada.
2. Gunakan token spacing yang sudah ada.
3. Gunakan token typography yang sudah ada.
4. Gunakan grid canonical.
5. Gunakan pola responsive canonical.
6. Buat pola baru hanya jika benar-benar dibutuhkan.

### Master §87 — FINAL FORMULA

```text
CONTENT
+
CLEAR HIERARCHY
+
CONTROLLED DENSITY
+
CONSISTENT GRID
+
CONSISTENT TYPOGRAPHY
+
CONSISTENT SURFACE
+
STRONG PRODUCT PHOTOGRAPHY
+
CLEAR CTA
+
DEBRODER GREEN SIGNATURE
+
INDONESIAN-FIRST UI
=
DEBRODER UI
```

### Master §88 — FINAL PRINCIPLE

DEBRODER harus terasa seperti satu sistem dari:

```text
Beranda
→ Katalog
→ Detail Produk
→ Keranjang
→ Pembayaran
→ Akun
→ Admin
```

Pengguna tidak boleh merasa berpindah desain.

Mereka hanya berpindah fungsi di dalam satu produk DEBRODER yang utuh.

---

## Detailed Specification

### Domain intent

- DEBRODER harus terasa sebagai satu sistem visual utuh dari Beranda sampai Admin.
- Canonical components, tokens, typography, grid, dan responsive pattern harus digunakan sebelum membuat pola baru.
- Final formula dan final principle menjadi arah integrasi seluruh domain.
- Charter tidak memberi izin untuk mengubah OWNER LOCKED atau menutup open decision.

### Interpretation contract

- Setiap nilai angka, range, urutan, ratio, terminology, hierarchy, atau status yang berasal dari Master dipertahankan apa adanya.
- Penjelasan tambahan di dokumen ini adalah **IMPLEMENTATION GUIDANCE** kecuali dinyatakan sebagai CANONICAL/OWNER LOCKED dari Source Mapping.
- Existing implementation tidak boleh digunakan untuk menurunkan canonical target.
- Jika kebutuhan implementasi memerlukan detail yang belum ada di Master, detail tersebut tidak boleh disamarkan sebagai final decision.
- Cross-domain value harus dirujuk ke canonical owner-nya agar tidak membentuk source-of-truth ganda.

## Dimensions

- Dokumen governance tidak menentukan layout visual baru; ia menentukan authority dan ownership rule.

- Nilai dimension yang tersedia pada Canonical Rules di atas bersifat authoritative untuk domain ini.
- Jika tidak ada numeric dimension pada source, dokumen ini tidak membuat numeric value baru.
- Fixed, minimum, maximum, range, dan fluid behavior tidak boleh saling dipertukarkan tanpa source.

## Layout Contract

- Dokumen governance tidak menentukan layout visual baru; ia menentukan authority dan ownership rule.
- Setiap domain harus memiliki rumah canonical yang dapat dilacak.

## Typography Contract

- Terminologi status CANONICAL, OWNER LOCKED, IMPLEMENTATION GUIDANCE, dan BELUM FINAL harus konsisten.
- Jangan melemahkan wording source pada registry.

## Color / Surface Contract

- Open color decisions tetap unresolved sampai owner menetapkan nilai.
- Caution untuk keputusan belum final menggunakan framing yang sama dengan Master.

## Interaction Contract

- Governance digunakan sebelum implementasi atau review untuk menentukan authority.
- Konflik implementation dicatat sebagai gap, bukan alasan mengubah Master.

## Responsive Contract

- Governance tidak memfinalkan complete responsive matrix yang masih open.
- Rule responsive yang sudah canonical tetap dipertahankan.

## State Contract

- Status dokumen dan keputusan harus eksplisit agar reviewer tidak menganggap guidance sebagai locked rule.

## Accessibility Contract

- Governance memastikan accessibility tetap menjadi bagian contract domain dan quality gate.

## Edge Cases

- Content lebih panjang dari contoh harus tetap mengikuti hierarchy, wrapping, spacing, dan alignment canonical; jangan menyelesaikannya dengan random dimensions.
- Missing/loading/error/empty content tidak boleh menyebabkan domain kehilangan page focus atau terlihat seperti halaman dari sistem lain.
- Jika existing code tidak mampu memenuhi canonical rule, catat sebagai **IMPLEMENTATION GAP** pada package audit implementasi; jangan melemahkan dokumentasi.
- Jika suatu keputusan memang belum final di Master, gunakan `⚠ BELUM FINAL — OWNER DECISION REQUIRED` dan rujuk [Open Decisions Registry](03-open-decisions.md).

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

- DEBRODER harus terasa sebagai satu sistem visual utuh dari Beranda sampai Admin.
- Canonical components, tokens, typography, grid, dan responsive pattern harus digunakan sebelum membuat pola baru.
- Final formula dan final principle menjadi arah integrasi seluruh domain.
- Charter tidak memberi izin untuk mengubah OWNER LOCKED atau menutup open decision.
- Tidak ada numeric value canonical yang berubah dari Master.
- Tidak ada OWNER LOCKED decision yang direinterpretasikan.
- Tidak ada BELUM FINAL decision yang difinalkan sebagai canonical.
- State dan accessibility requirements dipertimbangkan bila domain memiliki interaksi.
- Source Mapping tersedia dan dapat dilacak ke Master.

## Related Documents

- [OWNER LOCKED Decisions Registry](01-owner-locked-decisions.md)
- [Open Decisions Registry](03-open-decisions.md)
- [Master Coverage Matrix §1–§88](04-master-coverage-matrix.md)

## Source Mapping

- Master §1 — PRINSIP UTAMA
- Master §2 — ARAH VISUAL DEBRODER
- Master §3 — ADAPTASI DISIPLIN PMG
- Master §86 — STATUS MASTER
- Master §87 — FINAL FORMULA
- Master §88 — FINAL PRINCIPLE
