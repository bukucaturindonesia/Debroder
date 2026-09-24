# Component Dimensions

## Status

**CANONICAL MODULAR SPECIFICATION**

**Authority:** `DEBRODER_MASTER_UI_SYSTEM_v1.0.md`

Dokumen ini adalah modular implementation specification. Canonical rule yang dikutip dari Master memiliki authority lebih tinggi daripada implementation guidance di dokumen ini.

## Purpose

Menjadi reference dimension matrix untuk navigation, controls, cards, modal, drawer, dan admin shell.

## Scope

Seluruh ukuran fixed/min/max/fluid yang disebut Master.

## Canonical Rules

### Master §76 — MASTER COMPONENT DIMENSION MATRIX

## Navigation

```text
Announcement Bar : 32–36px
Navbar Desktop   : 72px
Navbar Tablet    : 64px
Navbar Mobile    : 56–60px
Admin Topbar     : 64px
Admin Sidebar    : 248px
Sidebar Collapse : 72px
```

## Controls

```text
Small Button     : 36px
Standard Button  : 44px
Commerce Button  : 48px
PDP Primary CTA  : 52px
Input            : 44–48px
Size Selector    : 48px
Color Hit Area   : 44px
Icon Hit Area    : 44×44px
```

## Cards

```text
Product Card     : fluid / 4:5 image
Default Card     : padding 20–24px / radius 16px
Dense Card       : padding 16px / radius 12px
Feature Card     : padding 24–32px / radius 20px
```

## Modal

```text
Small   : 400px
Default : 520px
Large   : 720px
XL      : 960px
```

Mobile:

```text
viewport - 32px
```

## Drawer

Desktop:

```text
400–480px
```

Mobile:

```text
100% width
```

## Detailed Specification

### Domain intent

- Nilai di matrix adalah canonical; domain docs menjelaskan konteks tanpa mengubah nilai.
- Touch target minimum 44×44 tetap mengikat meskipun visual element lebih kecil.
- Fluid component tidak boleh diubah menjadi fixed width tanpa source.

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

- Nilai di matrix adalah canonical; domain docs menjelaskan konteks tanpa mengubah nilai.
- Touch target minimum 44×44 tetap mengikat meskipun visual element lebih kecil.
- Fluid component tidak boleh diubah menjadi fixed width tanpa source.
- Tidak ada numeric value canonical yang berubah dari Master.
- Tidak ada OWNER LOCKED decision yang direinterpretasikan.
- Tidak ada BELUM FINAL decision yang difinalkan sebagai canonical.
- State dan accessibility requirements dipertimbangkan bila domain memiliki interaksi.
- Source Mapping tersedia dan dapat dilacak ke Master.

## Related Documents

- [Button System](../05-components/02-buttons.md)
- [Form System](../05-components/03-forms.md)
- [Modal, Drawer & Popover Contract](../05-components/08-modal-drawer-popover.md)

## Source Mapping

- Master §19 — NAVIGATION
- Master §22 — CARD DIMENSIONS
- Master §30 — BUTTON SYSTEM
- Master §33 — FORM SYSTEM
- Master §35 — SIZE SELECTOR
- Master §36 — COLOR SWATCH
- Master §37 — ICON SYSTEM
- Master §47 — ADMIN SHELL
- Master §50 — ADMIN TABLE
- Master §60 — MOBILE STICKY CTA
- Master §76 — MASTER COMPONENT DIMENSION MATRIX
