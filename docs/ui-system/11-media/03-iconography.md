# Iconography

## Status

**CANONICAL MODULAR SPECIFICATION**

**Authority:** `DEBRODER_MASTER_UI_SYSTEM_v1.0.md`

Dokumen ini adalah modular implementation specification. Canonical rule yang dikutip dari Master memiliki authority lebih tinggi daripada implementation guidance di dokumen ini.

## Purpose

Menetapkan one-family principle, canonical sizes, stroke consistency, labels, dan open decision final icon family.

## Scope

Navigation, controls, feature icons, badges/support visuals.

## Canonical Rules

### Master §81 — MASTER IKONOGRAFI

Wajib menggunakan satu keluarga ikon yang konsisten.

Ukuran:

```text
16
18
20
24
```

Aturan:

- stroke konsisten;
- icon-only button memiliki label aksesibel;
- icon tidak menggantikan teks bila makna belum jelas;
- icon tidak boleh random style.

## Detailed Specification

### Domain intent

- Satu keluarga ikon konsisten.
- Sizes 16/18/20/24.
- Icon-only button accessible.
- Icon tidak menggantikan text bila makna belum jelas.
- Final icon family masih belum final.

### Interpretation contract

- Setiap nilai angka, range, urutan, ratio, terminology, hierarchy, atau status yang berasal dari Master dipertahankan apa adanya.
- Penjelasan tambahan di dokumen ini adalah **IMPLEMENTATION GUIDANCE** kecuali dinyatakan sebagai CANONICAL/OWNER LOCKED dari Source Mapping.
- Existing implementation tidak boleh digunakan untuk menurunkan canonical target.
- Jika kebutuhan implementasi memerlukan detail yang belum ada di Master, detail tersebut tidak boleh disamarkan sebagai final decision.
- Cross-domain value harus dirujuk ke canonical owner-nya agar tidak membentuk source-of-truth ganda.

## Dimensions

- Media mengikuti ratio dan alignment system per section.

- Nilai dimension yang tersedia pada Canonical Rules di atas bersifat authoritative untuk domain ini.
- Jika tidak ada numeric dimension pada source, dokumen ini tidak membuat numeric value baru.
- Fixed, minimum, maximum, range, dan fluid behavior tidak boleh saling dipertukarkan tanpa source.

## Layout Contract

- Media mengikuti ratio dan alignment system per section.
- Product media tidak stretch atau crop random.

## Typography Contract

- Media captions/metadata bila digunakan tetap secondary dan tidak mengambil hierarchy produk.

## Color / Surface Contract

- Readability veil hanya bila dibutuhkan; jangan menambah decorative overlay tanpa fungsi.

## Interaction Contract

- Zoom/thumbnail/video behavior yang belum final tidak diputuskan di spec ini.

## Responsive Contract

- Ratio canonical dipertahankan; behavior crop/zoom yang belum final tetap open.

## State Contract

- Placeholder/fallback/loading detail yang belum final tidak disamarkan sebagai canonical.

## Accessibility Contract

- Meaningful images membutuhkan alt/accessible naming sebagai implementation guidance; decorative media tidak menambah noise.

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

- Satu keluarga ikon konsisten.
- Sizes 16/18/20/24.
- Icon-only button accessible.
- Icon tidak menggantikan text bila makna belum jelas.
- Final icon family masih belum final.
- Tidak ada numeric value canonical yang berubah dari Master.
- Tidak ada OWNER LOCKED decision yang direinterpretasikan.
- Tidak ada BELUM FINAL decision yang difinalkan sebagai canonical.
- State dan accessibility requirements dipertimbangkan bila domain memiliki interaksi.
- Source Mapping tersedia dan dapat dilacak ke Master.

## Related Documents

- [Badges & Icons](../05-components/07-badges-icons.md)
- [Open Decisions Registry](../00-governance/03-open-decisions.md)

## Source Mapping

- Master §37 — ICON SYSTEM
- Master §68 — ACCESSIBILITY
- Master §81 — MASTER IKONOGRAFI
- Master §86 — STATUS MASTER
