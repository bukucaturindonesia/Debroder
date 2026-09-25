# Global Alignment & Section Header

## Status

**CANONICAL MODULAR SPECIFICATION**

**Authority:** `DEBRODER_MASTER_UI_SYSTEM_v1.0.md`

Dokumen ini adalah modular implementation specification. Canonical rule yang dikutip dari Master memiliki authority lebih tinggi daripada implementation guidance di dokumen ini.

## Purpose

Menetapkan edge alignment global dan anatomy section header desktop/mobile.

## Scope

Headings, actions, descriptions, grids, cards, dan major page edges.

## Canonical Rules

### Master §72 — GLOBAL ALIGNMENT RULE

Semua elemen major harus mengikuti salah satu:

```text
Master Container Edge
Grid Column
Card Content Edge
```

Jangan membuat heading mulai di posisi yang berbeda dengan grid produk tanpa alasan.

### Master §73 — SECTION HEADER

Desktop:

```text
Judul                           Aksi →
Deskripsi opsional
```

Mobile:

```text
Judul
Deskripsi
Aksi
```

Spacing:

```text
Section Header → Content: 24–32px
```

## Detailed Specification

### Domain intent

- Major elements mengikuti Master Container Edge, Grid Column, atau Card Content Edge.
- Heading tidak boleh random offset terhadap product grid.
- Desktop dan mobile section header memiliki susunan berbeda sesuai Master.
- Section Header → Content memakai range canonical.

### Interpretation contract

- Setiap nilai angka, range, urutan, ratio, terminology, hierarchy, atau status yang berasal dari Master dipertahankan apa adanya.
- Penjelasan tambahan di dokumen ini adalah **IMPLEMENTATION GUIDANCE** kecuali dinyatakan sebagai CANONICAL/OWNER LOCKED dari Source Mapping.
- Existing implementation tidak boleh digunakan untuk menurunkan canonical target.
- Jika kebutuhan implementasi memerlukan detail yang belum ada di Master, detail tersebut tidak boleh disamarkan sebagai final decision.
- Cross-domain value harus dirujuk ke canonical owner-nya agar tidak membentuk source-of-truth ganda.

## Dimensions

- Container, grid, column span, spacing, dan alignment harus membentuk satu geometry konsisten.

- Nilai dimension yang tersedia pada Canonical Rules di atas bersifat authoritative untuk domain ini.
- Jika tidak ada numeric dimension pada source, dokumen ini tidak membuat numeric value baru.
- Fixed, minimum, maximum, range, dan fluid behavior tidak boleh saling dipertukarkan tanpa source.

## Layout Contract

- Container, grid, column span, spacing, dan alignment harus membentuk satu geometry konsisten.
- Manual absolute/pixel positioning bukan alat layout utama.

## Typography Contract

- Text blocks align ke content edges dan tidak membuat baseline visual acak.

## Color / Surface Contract

- Layout tidak membutuhkan decorative background untuk menjelaskan hierarchy.

## Interaction Contract

- Sticky/floating element harus direncanakan terhadap content offset dan stacking.

## Responsive Contract

- Grid/stack behavior mengikuti canonical device system dan component need.
- Mobile adalah reflow prioritas, bukan scale-down desktop.

## State Contract

- Loading/empty/error harus tetap memakai layout footprint yang stabil bila memungkinkan.

## Accessibility Contract

- Reflow tidak boleh memutus keyboard order atau membuat target interaksi saling tumpang tindih.

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

- Major elements mengikuti Master Container Edge, Grid Column, atau Card Content Edge.
- Heading tidak boleh random offset terhadap product grid.
- Desktop dan mobile section header memiliki susunan berbeda sesuai Master.
- Section Header → Content memakai range canonical.
- Tidak ada numeric value canonical yang berubah dari Master.
- Tidak ada OWNER LOCKED decision yang direinterpretasikan.
- Tidak ada BELUM FINAL decision yang difinalkan sebagai canonical.
- State dan accessibility requirements dipertimbangkan bila domain memiliki interaksi.
- Source Mapping tersedia dan dapat dilacak ke Master.

## Related Documents

- [Container & Content Width](01-container-width.md)
- [Grid System](02-grid-system.md)

## Source Mapping

- Master §5 — GLOBAL CONTAINER
- Master §7 — GRID SYSTEM
- Master §72 — GLOBAL ALIGNMENT RULE
- Master §73 — SECTION HEADER
