# DEBRODER v1.2 Phase 3B — Public Mockup Approval

## Database

Migration `mockup_public_approval_phase_3b` sudah diterapkan ke Supabase aktif.

### Tabel baru

`mockup_review_links`

Menyimpan:
- token hash, bukan token mentah
- mockup terkait
- masa berlaku
- status revoked
- pembuat tautan
- waktu terakhir dibuka

Tautan lama otomatis dinonaktifkan saat tautan baru dibuat.

## Alur admin

Detail Penawaran
→ Mockup & Persetujuan
→ Tandai Siap Diperiksa
→ Kirim ke Pelanggan
→ Pilih masa berlaku
→ Buat Tautan Baru
→ Salin Tautan

Admin juga dapat:
- menonaktifkan tautan;
- melihat keputusan pelanggan;
- memulai revisi hanya pada bagian yang diminta;
- mengunggah file versi baru;
- membuat tautan baru untuk pemeriksaan ulang.

## Alur publik

`/persetujuan/mockup/{token}`

Pelanggan dapat:
- melihat nomor penawaran;
- melihat bagian desain;
- membuka file privat;
- menyetujui per bagian;
- meminta perubahan per bagian dengan catatan wajib;
- melihat progres bagian wajib.

Bahasa publik tidak menampilkan kode status teknis.

## Keamanan

- Token mentah hanya tampil saat tautan dibuat.
- Database hanya menyimpan SHA-256 token.
- Tautan mempunyai masa berlaku 1–30 hari.
- Tautan dapat dicabut oleh admin.
- Tautan otomatis dicabut setelah semua bagian wajib disetujui.
- Keputusan hanya dapat dilakukan pada bagian dari mockup yang sesuai.
- File privat diakses melalui route server dan signed URL 5 menit.
- Route file memverifikasi token, masa berlaku, revoked status, mockup, dan file.

## Environment Vercel wajib

Tambahkan environment variable berikut jika belum tersedia:

```text
SUPABASE_SERVICE_ROLE_KEY=<service role key proyek DEBRODER>
```

Jangan memakai prefix `NEXT_PUBLIC_`.

Setelah menambahkan environment variable, lakukan redeploy.

`NEXT_PUBLIC_SUPABASE_URL` tetap memakai konfigurasi proyek yang sudah ada.

## Aturan approval

- Revisi satu bagian tidak membatalkan persetujuan bagian lain.
- Catatan wajib untuk permintaan revisi.
- Semua bagian wajib harus berstatus approved agar mockup utama menjadi approved.
- Tautan otomatis mati ketika seluruh bagian wajib disetujui.
- File dan keputusan lama tetap menjadi audit history.

## Verifikasi wajib

1. Gunakan mockup dengan semua bagian wajib memiliki file.
2. Tandai Siap Diperiksa.
3. Klik Kirim ke Pelanggan.
4. Buat tautan 7 hari.
5. Salin dan buka pada browser incognito.
6. Buka file desain.
7. Setujui satu bagian.
8. Minta perubahan pada bagian lain dan isi catatan.
9. Kembali ke admin dan pastikan status bagian berubah.
10. Klik Mulai Revisi pada bagian tersebut.
11. Unggah file versi baru.
12. Tandai siap diperiksa dan buat tautan baru.
13. Setujui seluruh bagian wajib.
14. Pastikan mockup utama menjadi approved.
15. Pastikan tautan lama tidak dapat digunakan.
16. Uji tombol Nonaktifkan Tautan.
17. Uji desktop dan mobile.
18. Jalankan typecheck, lint, test, build.

## Selesai Phase 3

Setelah 3A dan 3B owner-verified:
- mockup lifecycle lengkap;
- file versioning lengkap;
- public review aman;
- approval per bagian;
- revision per bagian;
- audit history;
- semua bagian wajib disetujui.

Phase berikutnya adalah Phase 4 — Order Conversion.
