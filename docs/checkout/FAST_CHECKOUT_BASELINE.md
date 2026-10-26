# Fast Checkout V1 — baseline dan scope

26 Oktober 2026, Asia/Makassar. SOLO execution; tidak ada agen lain.

## Identitas

Snapshot kerja asli tidak mempunyai `.git`. Source tetap dipertahankan di sana. Repository Git dipulihkan ke folder review terpisah:

`C:/Users/OMEN/.codex/visualizations/2026/10/26/01a17676-9129-71e2-8bb4-c7f56ff193da/debroder-fast-checkout-review`

Branch: `codex/fast-checkout-v1-20261026`, base `eab5f3e460e1c3fd298f015c0c43a277bb0db6fa`. Sepuluh original file yang akan diubah cocok dengan blob GitHub. Perbandingan 803 source/config files dengan clone, setelah CRLF dinormalisasi pada kedua sisi, menemukan hanya lima perubahan existing source yang diketahui berasal dari tugas ini/checkout recovery sebelumnya. Lihat `remote-baseline-identities.json` dan `source-baseline-comparison.json`. File baru diperiksa melalui manifest payload; source lain tidak disalin sebagai perubahan.

PR #54 tetap OPEN, bukan merged, head `726c69267a400730e894881d8ae8a44b32921b76`, branch `codex/unified-category-hero-v1`, 94 changed files. Tidak diubah/diintegrasikan. Draft PR Fast Checkout terpisah dan tidak mengizinkan merge main/production.

Baseline lokal sesi sebelumnya: 156 files / 1078 tests, build 142 halaman, lint 35 warning, historical verified pada 26 Oktober. Hasil final tugas ini dicatat terpisah di `UX_QA_EVIDENCE.md`; historical evidence tidak disebut sebagai rerun.

## Audit integrasi aktual

Checkout lama sudah single route, tetapi ongkir memerlukan Admin; payment public menggunakan bukti manual. Order dibuat sebelum payment dan mempunyai recovery key. Custom/Configurator memiliki pricing/approval contracts sendiri. Tidak ditemukan adapter Midtrans/RajaOngkir existing yang dapat dipakai langsung.

Payment ledger lama mewajibkan human reviewer, verified amount/reference, dan checklist. Definisi guard staging dibaca langsung dan dibandingkan dengan cabang manual pada candidate. Jalur gateway baru memakai evidence attempt terpisah, tidak mengisi reviewer manusia fiktif. Pengaruh trigger stok/fulfillment/audit lain pada staging belum diuji.

Staging `ykfjgnrigcsapblbxnxb`: schema, constraints, triggers, dan guard diperiksa read-only. Audit sebelumnya menemukan 138 applied remote numeric versions vs 145 local; empat remote-only termasuk dua koreksi checkout Oktober. Tidak menganggap local migrations otomatis sama dengan staging. Candidate baru menambah satu local migration; tidak ada apply/replay/reset.

## Implementasi

- `/checkout` memilih Fast Checkout ketika `DEBRODER_FAST_CHECKOUT_ENABLED=1`; default tetap 0.
- Fast lane hanya ready stock tanpa instant services. Guest dan profil/alamat tersimpan didukung pada source. Draft lama tetap memakai recovery lama.
- Ringkasan produk, penerima, pencarian tujuan, alamat, tarif kurir, total, BAYAR SEKARANG pada satu halaman. Tidak ada upload proof pada fast lane.
- Custom, Instant Custom, dan Jersey Configurator tetap memakai alur lama. Integrasi Snap bagi final Custom/DP **belum selesai**; perlu adapter otorisasi payment-link, quote-lock, dan reservation acceptance yang terverifikasi. Tidak dipaksa melalui ready-stock RPC.
- Adapter RajaOngkir, signed quote, authoritative price/weight preview, final provider revalidation, canonical order creation, Snap attempt mapping, authenticated status reconciliation, webhook, dan Admin settings ditambahkan.
- `lib/checkout-recovery.ts` serta regression dari checkpoint sebelumnya disertakan agar arbitrary 404 tetap tidak mengizinkan penggantian key.

## Route/data/state ownership

| Route | Tujuan / sumber / akses |
|---|---|
| `/checkout` | Fast guest/account checkout; PIM/cart + server config; CTA dari cart, keluar Snap/confirmation; loading/empty/error/pending tersedia |
| `/admin/checkout-settings` | Settings + PIM shipping dimensions + reconciliation queue; menu Pengiriman & Pembayaran; settings.read, mutation owner/superadmin global + settings.manage; loading/error/retry/empty queue tersedia |
| `/api/checkout/fast/config`, `/api/checkout/fast`, `/api/checkout/fast/recover` | Public capability/idempotency boundary; server-only database and environment guard |
| `/api/shipping/destinations`, `/api/shipping/quotes` | RajaOngkir server requests, signed short-lived destinations/quotes, rate limited |
| `/api/payments/midtrans/snap`, `/api/payments/midtrans/status` | POST body order ID + bearer capability token, never browser amount authority |
| `/api/payments/midtrans/notification` | Signed notification + authenticated current-provider status before atomic database apply |
| `/api/admin/checkout-settings` | Guarded settings/PIM logistics source, no secret values returned |

No new product/detail route, product price source, or CMS ownership change. Historical orders/payments remain readable through existing routes.
