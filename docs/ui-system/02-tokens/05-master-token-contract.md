# Master Token Contract

## Status

**CANONICAL MODULAR SPECIFICATION**

**Authority:** `DEBRODER_MASTER_UI_SYSTEM_v1.0.md`

Dokumen ini adalah modular implementation specification. Canonical rule yang dikutip dari Master memiliki authority lebih tinggi daripada implementation guidance di dokumen ini.

## Purpose

Menetapkan nama token canonical yang tersedia dan aturan pemakaiannya sebagai implementation contract.

## Scope

Container, spacing, radius, controls, navigation, sidebar/topbar, dan z-index.

## Canonical Rules

### Master §77 — MASTER TOKENS

```css
:root {
  --container-max: 1280px;

  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;
  --space-20: 80px;
  --space-24: 96px;
  --space-30: 120px;

  --radius-xs: 4px;
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 20px;
  --radius-full: 999px;

  --control-sm: 36px;
  --control-md: 44px;
  --control-lg: 48px;
  --control-xl: 52px;

  --nav-desktop: 72px;
  --nav-tablet: 64px;
  --nav-mobile: 58px;

  --sidebar-admin: 248px;
  --sidebar-admin-collapsed: 72px;
  --topbar-admin: 64px;

  --z-content: 0;
  --z-sticky: 10;
  --z-nav: 20;
  --z-dropdown: 30;
  --z-drawer: 40;
  --z-overlay: 50;
  --z-modal: 60;
  --z-toast: 70;
  --z-critical: 80;
}
```

## Detailed Specification

### Domain intent

- Token block Master dipertahankan tanpa rename atau value mutation.
- Jika implementation menambah alias, alias tidak menjadi canonical value baru.
- Token yang belum dipakai code tetap valid sebagai contract.

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

- Token block Master dipertahankan tanpa rename atau value mutation.
- Jika implementation menambah alias, alias tidak menjadi canonical value baru.
- Token yang belum dipakai code tetap valid sebagai contract.
- Tidak ada numeric value canonical yang berubah dari Master.
- Tidak ada OWNER LOCKED decision yang direinterpretasikan.
- Tidak ada BELUM FINAL decision yang difinalkan sebagai canonical.
- State dan accessibility requirements dipertimbangkan bila domain memiliki interaksi.
- Source Mapping tersedia dan dapat dilacak ke Master.

## Related Documents

- [Canonical Rules Governance](../00-governance/02-canonical-rules.md)
- [Spacing Tokens](01-spacing.md)
- [Component Dimensions](02-dimensions.md)

## Source Mapping

- Master §8 — SPACING SYSTEM
- Master §51 — BORDER RADIUS SYSTEM
- Master §61 — STICKY / Z-INDEX SYSTEM
- Master §76 — MASTER COMPONENT DIMENSION MATRIX
- Master §77 — MASTER TOKENS
