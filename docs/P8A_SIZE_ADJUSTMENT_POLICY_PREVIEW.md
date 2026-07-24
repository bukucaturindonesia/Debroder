# P8A — Size Adjustment Policy Preview

Tanggal audit: 2026-07-24  
Supabase project: `DEBRODER APPAREL` (`lzennundwqqtyvvcnzbg`)  
Mode: **READ ONLY / NO PRODUCT MUTATION**

## Authority

- Policy owner P8A: S–XL `Rp0`, 2XL `+Rp10.000`, 3XL `+Rp20.000`,
  dan 4XL `+Rp30.000`.
- Harga transaksi tetap menggunakan
  `product_variant_sizes.price_adjustment`.
- `product_size_master` adalah authority identitas ukuran dan tidak memiliki
  kolom harga.
- `product_sizes` tidak ada pada schema remote canonical.
- Historical order dan pricing snapshot tidak dibaca ulang atau diubah oleh
  preview.

## Hasil preview remote

| Klasifikasi | Jumlah SKU |
| --- | ---: |
| Seluruh sellable SKU | 1.173 |
| Sudah sesuai policy | 860 |
| Perlu perubahan setelah approval | 287 |
| Di luar policy P8A | 25 |
| Blocked karena master ukuran tidak tersedia | 1 |
| Duplikat normalized variant-size | 0 |
| Duplikat normalized SKU | 0 |
| Override eksplisit terbukti | 0 |

Before/after untuk 287 SKU terdampak:

| Ukuran | Before | After | SKU active | SKU draft | Total |
| --- | ---: | ---: | ---: | ---: | ---: |
| 2XL | Rp0 | +Rp10.000 | 15 | 175 | 190 |
| 3XL | Rp0 | +Rp20.000 | 15 | 61 | 76 |
| 4XL | Rp0 | +Rp30.000 | 15 | 6 | 21 |

## Konflik, duplikat, dan override

- 25 SKU `XS` tetap `OUT_OF_POLICY`; P8A tidak menetapkan policy XS.
- Satu SKU `Mix Size` memiliki `size_id = NULL`; statusnya `BLOCKED` dan tidak
  menjadi kandidat mutation P8B.
- Constraint/index remote mencegah duplikat SKU exact dan kombinasi
  `variant_id + size_name`; preview juga memeriksa duplikat setelah normalisasi
  alias seperti `XXL` dan `2XL`.
- Tidak ada event audit perubahan harga SKU yang memiliki alasan override.
  Karena itu status override adalah **NOT PROVEN**, bukan override valid.
- Jika evidence override eksplisit muncul, preview memberi status
  `OVERRIDE_REVIEW`; row tersebut tidak menjadi mutation otomatis.

## Artifact eksekusi

- Pure deterministic preview:
  `lib/size-adjustment-policy-preview.ts`
- Read-only remote query:
  `supabase/sql/04_p8a_size_adjustment_preview_read_only.sql`
- Regression:
  `test/p8a-size-adjustment-policy-preview.test.ts`

Query P8A hanya menghasilkan policy, summary, dan daftar SKU before/after.
Query tidak memiliki DML atau DDL. P8A tidak membuat migration dan tidak
melakukan backfill. P8B hanya boleh memproses row yang disetujui owner dari
status `PENDING_CHANGE`.
