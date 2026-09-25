# Motion

## Status

**CANONICAL MODULAR SPECIFICATION**

**Authority:** `DEBRODER_MASTER_UI_SYSTEM_v1.0.md`

Dokumen ini adalah modular implementation specification. Canonical rule yang dikutip dari Master memiliki authority lebih tinggi daripada implementation guidance di dokumen ini.

## Purpose

Menetapkan duration bands, entering easing, hover scale limit, prohibited motion, dan reduced-motion compliance.

## Scope

Microinteractions, standard transitions, large overlays, product image hover.

## Canonical Rules

### Master §67 — MOTION

Micro:

```text
150–200ms
```

Standard:

```text
200–240ms
```

Large:

```text
240–320ms
```

Entering UI:

```text
ease-out
```

Product image hover:

```text
scale maksimum ±1.02
```

Dilarang:

- bounce berlebihan;
- parallax agresif;
- card bergoyang;
- animasi yang memperlambat checkout.

Reduced-motion wajib dihormati.

## Detailed Specification

### Domain intent

- Micro 150–200ms; Standard 200–240ms; Large 240–320ms.
- Entering uses ease-out.
- Product image hover max ±1.02.
- No excessive bounce/parallax/card wobble or checkout-slowing animation.

### Interpretation contract

- Setiap nilai angka, range, urutan, ratio, terminology, hierarchy, atau status yang berasal dari Master dipertahankan apa adanya.
- Penjelasan tambahan di dokumen ini adalah **IMPLEMENTATION GUIDANCE** kecuali dinyatakan sebagai CANONICAL/OWNER LOCKED dari Source Mapping.
- Existing implementation tidak boleh digunakan untuk menurunkan canonical target.
- Jika kebutuhan implementasi memerlukan detail yang belum ada di Master, detail tersebut tidak boleh disamarkan sebagai final decision.
- Cross-domain value harus dirujuk ke canonical owner-nya agar tidak membentuk source-of-truth ganda.

## Dimensions

- Feedback ditempatkan dekat source action dan menjaga content footprint bila memungkinkan.

- Nilai dimension yang tersedia pada Canonical Rules di atas bersifat authoritative untuk domain ini.
- Jika tidak ada numeric dimension pada source, dokumen ini tidak membuat numeric value baru.
- Fixed, minimum, maximum, range, dan fluid behavior tidak boleh saling dipertukarkan tanpa source.

## Layout Contract

- Feedback ditempatkan dekat source action dan menjaga content footprint bila memungkinkan.

## Typography Contract

- Pesan feedback singkat, jelas, dan Bahasa Indonesia.
- Error harus menjawab tiga pertanyaan Master.

## Color / Surface Contract

- Semantic color digunakan sesuai error/warning/info/success/unfinished contract.
- Jangan mengandalkan warna saja.

## Interaction Contract

- Retry/recovery action memiliki hierarchy yang jelas.
- Success kecil tidak menggunakan modal besar.

## Responsive Contract

- Feedback tetap terlihat dan tidak tertutup sticky UI.
- Skeleton reflow sesuai content geometry.

## State Contract

- State yang berbeda harus dapat dibedakan secara semantik dan visual.
- Loading tidak menghapus context penting.

## Accessibility Contract

- Announcements/focus/error association harus dapat dipahami assistive technology sebagai implementation guidance.

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

- Micro 150–200ms; Standard 200–240ms; Large 240–320ms.
- Entering uses ease-out.
- Product image hover max ±1.02.
- No excessive bounce/parallax/card wobble or checkout-slowing animation.
- Tidak ada numeric value canonical yang berubah dari Master.
- Tidak ada OWNER LOCKED decision yang direinterpretasikan.
- Tidak ada BELUM FINAL decision yang difinalkan sebagai canonical.
- State dan accessibility requirements dipertimbangkan bila domain memiliki interaksi.
- Source Mapping tersedia dan dapat dilacak ke Master.

## Related Documents

- [Accessibility Contract](05-accessibility.md)
- [Interactive Component State Contract](../05-components/09-component-state-contract.md)

## Source Mapping

- Master §62 — STATE SYSTEM
- Master §67 — MOTION
- Master §68 — ACCESSIBILITY
