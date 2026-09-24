# Visual Direction

## Status

**CANONICAL MODULAR SPECIFICATION**

**Authority:** `DEBRODER_MASTER_UI_SYSTEM_v1.0.md`

Dokumen ini adalah modular implementation specification. Canonical rule yang dikutip dari Master memiliki authority lebih tinggi daripada implementation guidance di dokumen ini.

## Purpose

Mendefinisikan karakter visual Premium Apparel Commerce DEBRODER dan disiplin yang diadaptasi dari PMG.

## Scope

Arah visual lintas homepage, commerce, customer, dan admin dengan density sesuai domain.

## Canonical Rules

### Master §2 — ARAH VISUAL DEBRODER

DEBRODER bukan:

- template ecommerce generik;
- marketplace murah;
- dashboard SaaS generik;
- UI penuh kartu;
- UI penuh gradient;
- UI penuh rounded box;
- UI penuh shadow;
- UI hitam-putih tanpa identitas.

DEBRODER harus terasa:

- Premium Apparel Commerce;
- Editorial Retail;
- Commerce-first;
- Clean;
- Precise;
- Modern;
- Controlled;
- Strong Product Photography;
- Clear Product Hierarchy;
- Strong CTA;
- Consistent System.

### Master §3 — ADAPTASI DISIPLIN PMG

Yang diambil dari PMG:

- layer architecture;
- hierarchy;
- controlled density;
- surface system;
- typography discipline;
- spacing discipline;
- fixed/sticky navigation discipline;
- responsive behavior;
- contrast rules;
- information priority;
- icon discipline;
- controlled border/radius/shadow;
- satu halaman = satu fokus utama.

Yang tidak disalin:

- visual dashboard workforce;
- warna PMG;
- enterprise dashboard density;
- layout operasional PMG;
- gaya yang tidak relevan dengan commerce.

Formula adaptasi:

PMG Enterprise Discipline
→ diadaptasikan →
DEBRODER Premium Commerce Discipline

## Detailed Specification

### Domain intent

- Premium Apparel Commerce, Editorial Retail, Commerce-first, clean, precise, modern, controlled.
- Strong product photography dan strong CTA menjadi penopang visual, bukan dekorasi generik.
- Disiplin PMG yang diambil adalah sistematisasi; visual workforce/enterprise PMG tidak disalin.
- Hindari full-card, full-gradient, full-rounded, full-shadow, atau monochrome tanpa identitas.

### Interpretation contract

- Setiap nilai angka, range, urutan, ratio, terminology, hierarchy, atau status yang berasal dari Master dipertahankan apa adanya.
- Penjelasan tambahan di dokumen ini adalah **IMPLEMENTATION GUIDANCE** kecuali dinyatakan sebagai CANONICAL/OWNER LOCKED dari Source Mapping.
- Existing implementation tidak boleh digunakan untuk menurunkan canonical target.
- Jika kebutuhan implementasi memerlukan detail yang belum ada di Master, detail tersebut tidak boleh disamarkan sebagai final decision.
- Cross-domain value harus dirujuk ke canonical owner-nya agar tidak membentuk source-of-truth ganda.

## Dimensions

- Arah visual harus diterjemahkan lewat hierarchy, spacing, photography, dan density sebelum dekorasi.

- Nilai dimension yang tersedia pada Canonical Rules di atas bersifat authoritative untuk domain ini.
- Jika tidak ada numeric dimension pada source, dokumen ini tidak membuat numeric value baru.
- Fixed, minimum, maximum, range, dan fluid behavior tidak boleh saling dipertukarkan tanpa source.

## Layout Contract

- Arah visual harus diterjemahkan lewat hierarchy, spacing, photography, dan density sebelum dekorasi.
- Satu halaman tetap memiliki satu fokus utama.

## Typography Contract

- Scale besar hanya digunakan ketika priority memang tinggi.
- Precision dan premium feel dibangun melalui hierarchy, bukan oversizing.

## Color / Surface Contract

- Neutral mendominasi; green menjadi signature.
- Visual direction tidak boleh bergantung pada gradient/shadow untuk terasa premium.

## Interaction Contract

- CTA yang paling penting harus jelas, tetapi tidak setiap tindakan dibuat primary.
- Interaction mendukung commerce-first behavior.

## Responsive Contract

- Mobile harus menjaga commerce priority; jangan hanya mengecilkan desktop.
- Editorial richness tidak boleh menghalangi transaksi.

## State Contract

- State visual harus tetap konsisten dengan arah visual utama, bukan membentuk style baru per component.

## Accessibility Contract

- Contrast, focus, touch target, dan non-color communication adalah bagian dari premium quality.

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

- Premium Apparel Commerce, Editorial Retail, Commerce-first, clean, precise, modern, controlled.
- Strong product photography dan strong CTA menjadi penopang visual, bukan dekorasi generik.
- Disiplin PMG yang diambil adalah sistematisasi; visual workforce/enterprise PMG tidak disalin.
- Hindari full-card, full-gradient, full-rounded, full-shadow, atau monochrome tanpa identitas.
- Tidak ada numeric value canonical yang berubah dari Master.
- Tidak ada OWNER LOCKED decision yang direinterpretasikan.
- Tidak ada BELUM FINAL decision yang difinalkan sebagai canonical.
- State dan accessibility requirements dipertimbangkan bila domain memiliki interaksi.
- Source Mapping tersedia dan dapat dilacak ke Master.

## Related Documents

- [Density & Surface System](03-density-surface.md)
- [Information Hierarchy](04-information-hierarchy.md)
- [DEBRODER Color System](../04-typography-color/02-color-system.md)

## Source Mapping

- Master §1 — PRINSIP UTAMA
- Master §2 — ARAH VISUAL DEBRODER
- Master §3 — ADAPTASI DISIPLIN PMG
- Master §16 — COLOR PHILOSOPHY
- Master §54 — PAGE FOCUS RULE
- Master §55 — INFORMATION PRIORITY
- Master §56 — VISUAL WEIGHT
- Master §87 — FINAL FORMULA
- Master §88 — FINAL PRINCIPLE
