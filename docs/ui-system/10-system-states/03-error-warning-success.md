# Error, Warning & Success

## Status

**CANONICAL MODULAR SPECIFICATION**

**Authority:** `DEBRODER_MASTER_UI_SYSTEM_v1.0.md`

Dokumen ini adalah modular implementation specification. Canonical rule yang dikutip dari Master memiliki authority lebih tinggi daripada implementation guidance di dokumen ini.

## Purpose

Mengatur feedback semantic lintas error, caution/warning, success, retry, transaction failure, stock, and connection states.

## Scope

Public commerce, customer, admin, forms, transaction feedback.

## Canonical Rules

### Master §65 — ERROR SYSTEM

Error harus menjawab:

1. Apa yang salah?
2. Apa dampaknya?
3. Apa yang harus dilakukan?

Dilarang hanya menampilkan:

```text
Something went wrong
```

UI harus menggunakan Bahasa Indonesia.

### Master §66 — SUCCESS SYSTEM

Success feedback harus dekat dengan tindakan.

Contoh:

```text
Ditambahkan ke keranjang
Alamat berhasil disimpan
Pesanan berhasil dibuat
```

Jangan gunakan modal besar untuk success kecil.

### Master §82 — MASTER FEEDBACK

Wajib punya pola canonical untuk:

- loading;
- skeleton;
- success;
- caution;
- warning;
- error;
- retry;
- empty state;
- stok habis;
- transaksi gagal;
- koneksi gagal;
- pembayaran gagal;
- pencarian kosong;
- keranjang kosong.

## Detailed Specification

### Domain intent

- Error menjawab apa yang salah, dampaknya, dan tindakan.
- Success kecil dekat dengan tindakan dan tidak memakai modal besar.
- Master Feedback mencakup loading, skeleton, success, caution, warning, error, retry, empty, stock, transaction/payment/connectivity failures.
- Merah semantic tidak dipakai dekoratif.

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

## Feedback Coverage Matrix

Master Feedback mengharuskan pola canonical untuk:

- loading;
- skeleton;
- success;
- caution;
- warning;
- error;
- retry;
- empty state;
- stok habis;
- transaksi gagal;
- koneksi gagal;
- pembayaran gagal;
- pencarian kosong;
- keranjang kosong.

Loading/skeleton dan empty states memiliki dokumen domain sendiri; file ini menjaga semantic relationship seluruh feedback.

## Error Copy Framework

Setiap error harus menjawab:

```text
Apa yang salah?
Apa dampaknya?
Apa yang harus dilakukan?
```

Contoh generic English `Something went wrong` tidak memenuhi contract.

## Success Proximity

Success kecil seperti `Ditambahkan ke keranjang` harus dekat dengan source action. Modal besar hanya untuk high-focus task, bukan micro-success.

## Caution / Warning Distinction

- Merah: caution/unfinished/error/failed/attention sesuai Master.
- Kuning: warning non-fatal.
- Biru: information.
- Brand green tidak otomatis dipakai sebagai success status jika menimbulkan semantic confusion.

Exact HEX/state palette tetap mengikuti Color System/Open Decisions.

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

- Error menjawab apa yang salah, dampaknya, dan tindakan.
- Success kecil dekat dengan tindakan dan tidak memakai modal besar.
- Master Feedback mencakup loading, skeleton, success, caution, warning, error, retry, empty, stock, transaction/payment/connectivity failures.
- Merah semantic tidak dipakai dekoratif.
- Tidak ada numeric value canonical yang berubah dari Master.
- Tidak ada OWNER LOCKED decision yang direinterpretasikan.
- Tidak ada BELUM FINAL decision yang difinalkan sebagai canonical.
- State dan accessibility requirements dipertimbangkan bila domain memiliki interaksi.
- Source Mapping tersedia dan dapat dilacak ke Master.

## Related Documents

- [Semantic Color Contract](../04-typography-color/03-semantic-color.md)
- [Unfinished & Caution — OWNER LOCKED](../12-content/03-unfinished-caution.md)

## Source Mapping

- Master §17 — MASTER COLOR STATUS
- Master §62 — STATE SYSTEM
- Master §65 — ERROR SYSTEM
- Master §66 — SUCCESS SYSTEM
- Master §71 — FOOTNOTE / UNFINISHED RULE — LOCKED
- Master §82 — MASTER FEEDBACK
