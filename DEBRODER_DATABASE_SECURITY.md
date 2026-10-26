# DEBRODER Database & Security Audit — Agent 03

**Tanggal:** 22 Oktober 2026 (Asia/Makassar)  
**Branch / HEAD:** `codex/unified-category-hero-v1` / `726c69267a400730e894881d8ae8a44b32921b76`  
**Mode:** source review + live read-only Supabase inspection  
**Status keseluruhan:** **BLOCKED / NO-GO** untuk menyatakan auth, ownership, dan runtime transaksi VERIFIED.

## Ringkasan

Identitas Supabase production dan staging berhasil dikonfirmasi secara langsung. Login Admin dan registrasi pelanggan memiliki pemeriksaan token, role, status akun, email terverifikasi, dan reCAPTCHA di source code. Catalog read-only juga menunjukkan ownership pesanan dibatasi oleh policy RLS dan API customer memfilter berdasarkan `customer_user_id`; uji langsung dengan User A dan User B belum dilakukan.

Ada drift migration dan schema antar-environment yang perlu direkonsiliasi sebelum klaim kompatibilitas production. Advisor Supabase menyatakan Leaked Password Protection nonaktif di kedua project. Jalur pendaftaran membuat identity di Auth lebih dahulu lalu mengisi `app_metadata` melalui service role; kegagalan tahap kedua dapat meninggalkan identity yang tidak terprovisi dan jalur retry saat ini tidak mengulang provisioning. Upload desain juga menerima request anonim berbasis session token, sedangkan bucket mengizinkan upload langsung bagi authenticated user tanpa batas MIME/ukuran khusus bucket.

Tidak ada SQL/migration dibuat atau diterapkan. Tidak ada akun, pesanan, atau file dibaca; tidak ada perubahan database, Auth, Storage, staging, production, atau deployment.

## Peta arsitektur dan environment

| Environment | Project Supabase | Region / Postgres | Bukti pemetaan |
|---|---|---|---|
| Production — DEBRODER APPAREL | `lzennundwqqtyvvcnzbg` | `ap-northeast-1` / 17.6 | Nama dan project ref dikembalikan oleh daftar project Supabase live. |
| Staging — `debroder-staging` | `ykfjgnrigcsapblbxnxb` | `ap-northeast-2` / 17.6 | Daftar project live; `.env.e2e.staging.local` menunjuk ref ini. |
| Local/bootstrap | Belum dipastikan | — | URL di `.env.bootstrap.local` tidak berhasil dipetakan secara aman dari pemeriksaan ini. |

Vercel runtime project/key-role binding tidak diperiksa ulang. Ref production di atas mengidentifikasi project Supabase, bukan bukti bahwa setiap deployment Vercel memakai key dari project yang sama.

Migration list live:

- Production: **173** migration; versi terakhir yang dikembalikan `20260808131000 superadmin_product_management_permissions_v1`.
- Staging: **138** migration; versi terakhir `20261021041852 p0_instant_checkout_lock_v1`.
- Riwayat kedua project berbeda urutan/nama dan jumlah. Perbedaan jumlah tidak boleh dianggap sebagai daftar pending yang bisa di-apply berurutan. Staging sudah memiliki recovery regular checkout `20261020163915` dan instant lock `20261021041852`; production tidak mencantumkan keduanya pada daftar live yang diperiksa. Production harus dianggap belum memenuhi kontrak migration checkout terbaru sampai preflight function/schema membuktikan sebaliknya.

## Relasi database yang diperiksa

Relasi inti ada pada kedua project:

- `public.profiles.id` → `auth.users.id` untuk akun internal/Admin.
- `public.customer_profiles.id` → `auth.users.id`; `customer_addresses.customer_id` → `customer_profiles.id`.
- `orders.customer_user_id` → `auth.users.id`.
- `order_items.order_id` → `orders.id`; `order_items.product_id` → `products.id`.
- `profiles` (18 kolom), `customer_profiles` (9), `customer_addresses` (20), dan `order_items` (28) memiliki jumlah kolom sama. `orders` berbeda 79 vs 80 kolom; `products` berbeda 67 vs 41 kolom.
- Tidak ada tabel `carts` atau `cart_items` pada kedua project. Keranjang menggunakan penyimpanan browser (`debroder_cart_v1`) dan divalidasi lagi oleh checkout.

Perbedaan kolom pada `orders` dan terutama `products` adalah **schema drift terkonfirmasi**, tetapi belum dipetakan menjadi seluruh daftar kolom/pemakai route. Jangan replay baseline atau migration lama untuk menyamakan schema.

## Temuan autentikasi

### Admin login

`components/admin/AdminLogin.tsx` memakai Supabase password sign-in dengan public anon key, memperoleh `current_request_session_id`, mendaftarkan sesi lewat `register_admin_session_v1`, lalu meminta `/api/admin/session`. `lib/phase13-auth.ts` memverifikasi access token dengan `auth.getUser`, membaca `profiles`, memeriksa role/status/scope, sesi aktif, serta permission. Jalur ini fail-closed ketika profile, RPC, atau permission tidak tersedia.

Source flow **PASS secara statis**. Kegagalan login tertentu belum dapat direproduksi: tidak ada waktu kejadian/akun uji yang disediakan, akun live tidak dibaca, dan sumber log 24 jam yang tersedia hanya Edge, Postgres, dan PostgREST, tanpa stream Auth khusus. Akar masalah seperti password, account status, redirect/config, environment binding, atau RPC tidak boleh dipilih dari dugaan.

### Registrasi pelanggan

`app/api/customer/auth/register/route.ts` memvalidasi payload, reCAPTCHA action, menolak email internal secara generik, mendaftar melalui anon client server-only, meminta redirect verifikasi email, lalu menetapkan `account_type`, `signup_channel`, dan timestamp syarat melalui server-side `auth.admin.updateUserById`. `lib/customer-auth/server.ts` kemudian memverifikasi access token, confirmation timestamp, `app_metadata`, profile aktif, dan mengklaim order berdasarkan email terverifikasi.

**MAJOR — provisioning tidak atomik.** Auth signup selesai sebelum `app_metadata` diperbarui. Jika update tersebut gagal, endpoint mengembalikan 503 tetapi identity sudah dapat tersimpan. Pada retry, kode hanya menjalankan provisioning bila `identities.length > 0`; identity yang sudah ada dapat melewati blok itu sehingga akun tetap tanpa metadata yang diwajibkan untuk login customer. Jalur ini perlu pemulihan idempotent yang aman terhadap email enumeration sebelum dinyatakan siap.

**BLOCKED — Auth settings.** Source mengharuskan Confirm Email aktif: bila `signUp` mengembalikan session, endpoint mengembalikan `CUSTOMER_EMAIL_CONFIRMATION_REQUIRED`/503. Auth setting Confirm Email, redirect allowlist, rate limit, dan kecocokan site-key/secret tidak bisa dibaca lewat tools project yang tersedia. Advisor Auth secara eksplisit melaporkan **Leaked Password Protection Disabled** pada production dan staging.

`RECAPTCHA_SECRET_KEY` yang tidak ada di production membuat verifikasi register/resend/recovery gagal tertutup; site key kosong di client juga menghasilkan token kosong. Keadaan variable runtime tidak dibaca atau dicetak.

## RLS, ownership, API, dan Storage

### RLS dan ownership

RLS aktif pada tabel inti yang diperiksa. `Customer reads own orders` adalah policy permissive dengan `customer_user_id = auth.uid()` serta `archived_at IS NULL`. Guard store-scope adalah policy **RESTRICTIVE**. Production memasukkan syarat ownership ke policy guard; staging masih memakai bentuk guard lama tetapi memiliki `rbac store scope orders` RESTRICTIVE yang mempertahankan cabang owner. Karena mode live dibaca sebagai RESTRICTIVE, metadata ini **tidak membuktikan kebocoran lintas-order** yang sempat dicurigai saat flag mode belum tersedia.

`order_items` tidak memiliki policy SELECT untuk customer biasa; customer detail API lebih dulu memastikan order dimiliki user yang tervalidasi, kemudian membaca projection melalui server client. Profile/alamat customer memakai `id/customer_id = auth.uid()`. `claim_verified_customer_orders_v1` memeriksa `auth.uid() = p_customer_user_id` kecuali service role. Definisi/policy memberi bukti desain, bukan hasil uji PostgREST User A vs User B; uji anon dan dua-user masih **BLOCKED**.

### Storage dan API upload

Bucket `website-images` public pada kedua environment, selaras untuk media publik. Bucket bukti desain, pembayaran, refund, dan QC yang diperiksa private. Production memiliki `order-uploads` dan `fulfillment-proofs`; keduanya tidak terdaftar pada staging. Komponen Admin memakai bucket fulfillment dan order upload, sehingga staging belum setara untuk seluruh jalur tersebut.

**MAJOR — batas upload desain dapat dilewati.** `app/api/customer-uploads/route.ts` membatasi file melalui server ke 20 MiB dan daftar extension/MIME, tetapi route ini anonim dan memakai service-role client; token sesi disanitasi, namun RPC registrasi menerima token baru tanpa membuktikan token diterbitkan server atau terikat ke draft. Tidak ada rate limit yang terlihat pada route. Selain itu, policy `storage.objects` membolehkan authenticated owner mengunggah langsung ke `customer-designs`; metadata bucket live tidak memiliki batas ukuran atau MIME khusus. Jalur upload langsung tidak melewati validasi 20 MiB/MIME route. Bucket tetap private, sehingga temuan ini terkait abuse/cost dan file intake, bukan akses publik ke file.

Service-role client di source ditempatkan di modul `server-only`/API server; tidak ditemukan `NEXT_PUBLIC_SERVICE_ROLE_KEY`. Tidak ada secret dicetak atau diperiksa nilainya.

## Temuan dan tingkat risiko

| ID | Level | Status | Bukti / dampak |
|---|---|---|---|
| DBSEC-001 | BLOCKER release | OPEN | Production migration list berhenti di `20260808131000`, sedangkan staging memiliki recovery checkout sampai `20261021041852`; orders/products juga berbeda kolom. Tidak boleh menyatakan backend production kompatibel sebelum preflight target-spesifik. |
| DBSEC-002 | MAJOR | OPEN | Leaked Password Protection nonaktif pada kedua project menurut Supabase security advisor. |
| DBSEC-003 | MAJOR | OPEN | Signup dan `app_metadata` provisioning terpisah; kegagalan provisioning dapat membuat identity parsial yang tidak dipulihkan oleh retry saat ini. |
| DBSEC-004 | MAJOR | OPEN | Upload customer anonim berbasis token client dan upload Storage langsung melewati cap aplikasi; bucket `customer-designs` tidak memiliki cap MIME/ukuran khusus. |
| DBSEC-005 | MAJOR operasional | OPEN | Staging tidak memiliki bucket `order-uploads`/`fulfillment-proofs` yang ada di production. |
| DBSEC-006 | MAJOR audit backlog | OPEN | Advisor: production 47 SECURITY DEFINER callable by anon / 184 by authenticated; staging 18 / 127. Daftar advisor perlu triage per fungsi; angka ini sendiri tidak membuktikan tiap fungsi exploitable. |
| DBSEC-007 | BLOCKED | OPEN | Konfigurasi Confirm Email/redirect dan uji login/register/recovery/User A-vs-B belum dapat diverifikasi melalui konektor atau test identity aman yang tersedia. |

Advisor lain: production RLS-enabled/no-policy 8, mutable search path 6, extension di `public` 1; staging masing-masing 10, 2, dan 1. Tabel tanpa policy default-deny; status paparan perlu dikaitkan dengan schema exposure dan grants sebelum dianggap kerentanan.

## SQL/migrasi yang diusulkan

- **Tidak ada SQL dibuat atau diterapkan.** Tidak ada koreksi owner RLS pesanan yang terbukti perlu dari metadata live. Jangan membuat migration untuk mengubah policy `orders` hanya berdasarkan perbedaan teks antar-environment.
- Aktifkan/konfirmasi Leaked Password Protection dan Confirm Email/redirect allowlist melalui konfigurasi Auth project yang benar setelah membandingkan dua environment. Ini perubahan konfigurasi, bukan migration SQL.
- Untuk `customer-designs`, review migration forward-only yang membatasi insert langsung authenticated ke actor staff yang memang perlu, menambahkan batas bucket yang sesuai file contract, dan menambahkan rate-limit/token binding pada server upload. Ini dapat memengaruhi Custom upload/checkout; **wajib koordinasi dengan AI Director dan Agent 02 sebelum menyiapkan atau menerapkan migration**. Simpan policy lama sebagai rollback forward plan; jangan reset bucket/data atau menghapus objek.
- Rekonsiliasi production/staging menggunakan snapshot schema, function signature/ACL, dan applied migration aktual. Jangan menjalankan `db push`, baseline replay, atau seluruh rangkaian migration secara massal. Production memerlukan persetujuan owner terpisah sebelum mutasi.

## Bukti pengujian

**EXECUTED AND PASSED**

- Supabase project list/get pada kedua ref; SELECT katalog live untuk kolom/FK/RLS/policy mode/grant/bucket/function ACL; list migration; security advisor; ringkasan source log 24 jam. Tidak ada row pesanan, email, atau secret yang diminta.
- Tes lokal terfokus: `pnpm test test/store-scope-customer-rls.test.ts test/customer-account-email-verification-v1.test.ts test/customer-auth-server-acl.test.ts test/p12-admin-orders-ownership.test.ts` — **4 file / 18 tes lulus**. Ini tes kontrak source/static dan bukan bukti Auth atau RLS runtime.
- `git diff --check` — lulus sebelum dokumentasi audit ditambahkan; akan diperiksa lagi setelah handoff.

**BLOCKED / NOT RUN**

- Registrasi valid/tidak valid live, login/logout Admin/customer, reset password, role Admin, anon privacy, User A vs User B, Storage upload/denial, dan pengulangan transaksi: belum dijalankan. Tidak ada safe staging identity yang disediakan pada environment file; tidak membuat user/order/file uji.
- Typecheck, lint, seluruh test suite, build, browser, database smoke, migration apply, Vercel deployment/log, callback/webhook: tidak dijalankan karena perubahan source tidak dibuat dan tugas ini read-only.
- Database mutation: **NO**. Staging mutation: **NO**. Production mutation: **NO**. Migration attempted/applied: **NONE**. Rollback: **NOT APPLICABLE**.

## Langkah berikutnya dan keputusan

1. AI Director/Agent 02 menilai dampak alur upload desain sebelum perubahan policy atau endpoint disiapkan.
2. Owner menyediakan satu identitas Admin staging dan dua identitas customer staging yang aman, serta waktu/diagnostik non-secret untuk kasus login; jangan gunakan akun atau pesanan production sebagai fixture.
3. Verifikasi Confirm Email, redirect allowlist, reCAPTCHA configuration, leaked password protection, dan variable environment secara privat pada masing-masing project.
4. Lakukan preflight schema/function/migration production terhadap commit/deployment yang benar; hentikan pada perbedaan tak terjelaskan. Jangan mutasi production.
5. Setelah perbaikan ter-review dan staging test lulus, minta persetujuan terpisah untuk setiap perubahan staging/production.

**GO/NO-GO:** **NO-GO / BLOCKED** untuk menyatakan database/auth/security E2E terverifikasi atau production kompatibel dengan checkout terbaru. PASS hanya berlaku untuk identitas project, source review, catalog read-only, dan 18 tes kontrak lokal.
