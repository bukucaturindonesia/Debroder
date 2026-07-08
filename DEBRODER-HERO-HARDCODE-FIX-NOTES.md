# DEBRODER Hero Hardcode/Fallback Fix

Perbaikan ini mencegah hero landing menampilkan teks bawaan/hardcode seperti `KAOS POLOS NEW STATE APPAREL` saat admin mengosongkan field atau mengisi `.`.

## Perubahan utama

- Hero text hanya render jika field CMS valid.
- Field berisi kosong, `.`, `-`, atau `—` dianggap kosong dan tidak ditampilkan.
- Hero tidak lagi fallback ke judul produk/default text.
- Jika slide hanya punya gambar, hero tampil sebagai image-only slide.
- Placeholder admin hero tidak lagi memakai teks produk.
- Ditambahkan SQL opsional: `supabase/fix-hero-hardcoded-fallback.sql`.

## Kapan perlu jalankan SQL?

Jalankan SQL hanya kalau setelah deploy masih ada data lama di Supabase yang menampilkan teks bawaan.

