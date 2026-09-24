# Canonical Rules Governance

## Status

**CANONICAL GOVERNANCE SPECIFICATION**

**Authority:** `DEBRODER_MASTER_UI_SYSTEM_v1.0.md`

Dokumen ini adalah modular implementation specification. Canonical rule yang dikutip dari Master memiliki authority lebih tinggi daripada implementation guidance di dokumen ini.

## Purpose

Menjelaskan bagaimana canonical rule dimiliki, dirujuk, diterapkan, dan diaudit tanpa membuat source-of-truth ganda.

## Scope

Seluruh rule canonical lintas foundation, token, layout, component, commerce, responsive, state, dan QA.

## Canonical Rules

Dokumen ini tidak menjadi primary owner section Master baru. Ia menyatukan konteks dari canonical domain terkait tanpa menciptakan source-of-truth kedua.

- **Master §1 — PRINSIP UTAMA** — dipakai sebagai contextual source; canonical ownership berada di domain primary-nya.
- **Master §4 — MASTER UI LAYER SYSTEM** — dipakai sebagai contextual source; canonical ownership berada di domain primary-nya.
- **Master §8 — SPACING SYSTEM** — dipakai sebagai contextual source; canonical ownership berada di domain primary-nya.
- **Master §14 — TYPOGRAPHY SCALE** — dipakai sebagai contextual source; canonical ownership berada di domain primary-nya.
- **Master §16 — COLOR PHILOSOPHY** — dipakai sebagai contextual source; canonical ownership berada di domain primary-nya.
- **Master §21 — CARD FAMILY** — dipakai sebagai contextual source; canonical ownership berada di domain primary-nya.
- **Master §30 — BUTTON SYSTEM** — dipakai sebagai contextual source; canonical ownership berada di domain primary-nya.
- **Master §54 — PAGE FOCUS RULE** — dipakai sebagai contextual source; canonical ownership berada di domain primary-nya.
- **Master §62 — STATE SYSTEM** — dipakai sebagai contextual source; canonical ownership berada di domain primary-nya.
- **Master §77 — MASTER TOKENS** — dipakai sebagai contextual source; canonical ownership berada di domain primary-nya.
- **Master §79 — MASTER RESPONSIVE CONTRACT** — dipakai sebagai contextual source; canonical ownership berada di domain primary-nya.
- **Master §83 — MASTER QA UI CHECKLIST** — dipakai sebagai contextual source; canonical ownership berada di domain primary-nya.

## Detailed Specification

### Domain intent

- Satu canonical value harus memiliki satu rumah utama.
- Contextual reminder di domain lain wajib identik atau cukup berupa cross-reference.
- Implementation guidance tidak boleh mengubah kekuatan rule source.
- Numeric dan semantic drift harus dianggap defect dokumentasi.

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

- Satu canonical value harus memiliki satu rumah utama.
- Contextual reminder di domain lain wajib identik atau cukup berupa cross-reference.
- Implementation guidance tidak boleh mengubah kekuatan rule source.
- Numeric dan semantic drift harus dianggap defect dokumentasi.
- Tidak ada numeric value canonical yang berubah dari Master.
- Tidak ada OWNER LOCKED decision yang direinterpretasikan.
- Tidak ada BELUM FINAL decision yang difinalkan sebagai canonical.
- State dan accessibility requirements dipertimbangkan bila domain memiliki interaksi.
- Source Mapping tersedia dan dapat dilacak ke Master.

## Related Documents

- [Master Coverage Matrix §1–§88](04-master-coverage-matrix.md)
- [Master Token Contract](../02-tokens/05-master-token-contract.md)
- [Definition of Done](../13-quality/03-definition-of-done.md)

## Source Mapping

- Master §1 — PRINSIP UTAMA
- Master §4 — MASTER UI LAYER SYSTEM
- Master §8 — SPACING SYSTEM
- Master §14 — TYPOGRAPHY SCALE
- Master §16 — COLOR PHILOSOPHY
- Master §21 — CARD FAMILY
- Master §30 — BUTTON SYSTEM
- Master §54 — PAGE FOCUS RULE
- Master §62 — STATE SYSTEM
- Master §77 — MASTER TOKENS
- Master §79 — MASTER RESPONSIVE CONTRACT
- Master §83 — MASTER QA UI CHECKLIST
