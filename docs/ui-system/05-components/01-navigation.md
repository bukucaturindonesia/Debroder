# Navigation System

## Status

**CANONICAL MODULAR SPECIFICATION**

**Authority:** `DEBRODER_MASTER_UI_SYSTEM_v1.0.md`

Dokumen ini adalah modular implementation specification. Canonical rule yang dikutip dari Master memiliki authority lebih tinggi daripada implementation guidance di dokumen ini.

## Purpose

Menetapkan announcement bar, navbar, logo, search, sticky behavior, dan interaction discipline navigation.

## Scope

Desktop, tablet, mobile public navigation dan search surfaces.

## Canonical Rules

### Master §19 — NAVIGATION

## Announcement Bar

```text
32–36px
font: 12px
```

## Navbar

Desktop:

```text
72px
```

Tablet:

```text
64px
```

Mobile:

```text
56–60px
```

Navbar boleh sticky.

Jika sticky:

- readability wajib terjaga;
- background harus cukup solid;
- tidak boleh menutupi konten;
- z-index mengikuti system.

### Master §20 — LOGO

Logo harus memiliki ukuran konsisten antar halaman.

Recommended desktop:

```text
height: 24–28px
```

Jangan mengubah ukuran logo per halaman.

### Master §34 — SEARCH

Navbar search:

```text
40–44px
```

Search page:

```text
48px
```

Gunakan:

- icon pencarian di kiri;
- clear action di kanan ketika query aktif.

## Detailed Specification

### Domain intent

- Navbar boleh sticky jika readability dan content offset terjaga.
- Logo size konsisten antar halaman.
- Search memiliki left search icon dan clear action ketika query aktif.
- Dropdown/overlay harus mengikuti layer/z-index contract.
- Keyboard/focus behavior wajib.

### Interpretation contract

- Setiap nilai angka, range, urutan, ratio, terminology, hierarchy, atau status yang berasal dari Master dipertahankan apa adanya.
- Penjelasan tambahan di dokumen ini adalah **IMPLEMENTATION GUIDANCE** kecuali dinyatakan sebagai CANONICAL/OWNER LOCKED dari Source Mapping.
- Existing implementation tidak boleh digunakan untuk menurunkan canonical target.
- Jika kebutuhan implementasi memerlukan detail yang belum ada di Master, detail tersebut tidak boleh disamarkan sebagai final decision.
- Cross-domain value harus dirujuk ke canonical owner-nya agar tidak membentuk source-of-truth ganda.

## Dimensions

- Anatomy component harus stabil dan align dengan grid/card content edge.

- Nilai dimension yang tersedia pada Canonical Rules di atas bersifat authoritative untuk domain ini.
- Jika tidak ada numeric dimension pada source, dokumen ini tidak membuat numeric value baru.
- Fixed, minimum, maximum, range, dan fluid behavior tidak boleh saling dipertukarkan tanpa source.

## Layout Contract

- Anatomy component harus stabil dan align dengan grid/card content edge.
- Internal spacing menggunakan canonical token/range.

## Typography Contract

- Gunakan role type yang sesuai control/content; labels tidak oversize.

## Color / Surface Contract

- Brand green untuk primary/active/focus; semantic colors untuk status.
- Decorative color overload dilarang.

## Interaction Contract

- Definisikan hierarchy, target, keyboard/focus, disabled/loading behavior.
- Jangan menambahkan business workflow baru.

## Responsive Contract

- Tentukan apakah component remain/stack/full-width/drawer only jika source mendukung.
- Geometry tidak boleh pecah di mobile.

## State Contract

- Default/Hover/Focus/Aktif/Terpilih/Disabled/Loading/Error/Success dipertimbangkan sesuai relevansi.

## Accessibility Contract

- Controls mencapai minimum hit target, memiliki accessible name, dan keyboard behavior.

## Navigation Anatomy

### Announcement Bar

Canonical height `32–36px`, font `12px`. Announcement Bar adalah supporting layer; ia tidak boleh memiliki hierarchy lebih tinggi dari Navbar atau Page Hero.

### Navbar

Canonical height:

```text
Desktop: 72px
Tablet : 64px
Mobile : 56–60px
```

Navbar boleh sticky. Sticky tidak otomatis berarti translucent/glass effect; background harus cukup solid untuk readability.

### Logo

Recommended desktop height `24–28px`. Logo tidak boleh berubah size per page hanya karena local layout.

### Search

Navbar Search `40–44px`; Search Page `48px`. Search icon di kiri, clear action di kanan saat query aktif.

## Sticky Navigation Contract

Jika sticky:

- content tidak boleh tertutup;
- background/readability tetap terjaga;
- z-index menggunakan Navbar level;
- dropdown muncul di layer di atas Navbar;
- modal/drawer tetap mengalahkan Navbar.

## Keyboard / Focus Guidance

Navigation links/actions harus dapat dicapai keyboard. Focus order mengikuti visual reading order. Icon-only navigation actions mempunyai accessible label.

## Responsive Guidance

Master memberi heights untuk desktop/tablet/mobile, namun tidak memfinalkan complete mobile menu/mega-navigation matrix. Jangan mengarang dimensions atau transition pattern mobile menu sebagai canonical.

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

- Navbar boleh sticky jika readability dan content offset terjaga.
- Logo size konsisten antar halaman.
- Search memiliki left search icon dan clear action ketika query aktif.
- Dropdown/overlay harus mengikuti layer/z-index contract.
- Keyboard/focus behavior wajib.
- Tidak ada numeric value canonical yang berubah dari Master.
- Tidak ada OWNER LOCKED decision yang direinterpretasikan.
- Tidak ada BELUM FINAL decision yang difinalkan sebagai canonical.
- State dan accessibility requirements dipertimbangkan bila domain memiliki interaksi.
- Source Mapping tersedia dan dapat dilacak ke Master.

## Related Documents

- [Layer Architecture](../01-foundations/02-layer-architecture.md)
- [Z-Index Contract](../02-tokens/04-z-index.md)
- [Sticky Behavior](../09-responsive/04-sticky-behavior.md)

## Source Mapping

- Master §4 — MASTER UI LAYER SYSTEM
- Master §19 — NAVIGATION
- Master §20 — LOGO
- Master §34 — SEARCH
- Master §37 — ICON SYSTEM
- Master §61 — STICKY / Z-INDEX SYSTEM
- Master §69 — BAHASA UI — FINAL / LOCKED
