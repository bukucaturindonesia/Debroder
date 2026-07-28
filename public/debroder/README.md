# DEBRODER Brand Assets

Folder ini berisi paket aset logo DEBRODER siap pakai untuk website, branding, media sosial, favicon, app icon, dan deployment.

## Isi Folder

- `logo-primary-white.png` dan `logo-primary-white.svg`: logo utama putih dengan background transparan.
- `logo-primary-black.png` dan `logo-primary-black.svg`: logo utama hitam dengan background transparan.
- `logo-primary-white-512.png`, `logo-primary-white-1024.png`, `logo-primary-white-2048.png`, `logo-primary-white-4096.png`, `logo-primary-white-7680.png`: ukuran logo utama putih.
- `logo-primary-black-512.png`, `logo-primary-black-1024.png`, `logo-primary-black-2048.png`, `logo-primary-black-4096.png`, `logo-primary-black-7680.png`: ukuran logo utama hitam.
- `logo-primary-dark-bg.png`: preview logo putih di background gelap.
- `logo-symbol-white.png` dan `logo-symbol-white.svg`: versi symbol/icon putih.
- `logo-symbol-black.png` dan `logo-symbol-black.svg`: versi symbol/icon hitam.
- `logo-wordmark-white.png` dan `logo-wordmark-white.svg`: versi tulisan DEBRODER putih.
- `logo-wordmark-black.png` dan `logo-wordmark-black.svg`: versi tulisan DEBRODER hitam.
- `favicon.ico`, `favicon-16x16.png`, `favicon-32x32.png`, `favicon-48x48.png`: favicon website.
- `apple-touch-icon.png`, `android-chrome-192x192.png`, `android-chrome-512x512.png`, `web-app-icon-192.png`, `web-app-icon-512.png`: app icon dan PWA icon.
- `open-graph-logo.png`: gambar preview link ukuran 1200x630.
- `social-preview.png`: preview sosial ukuran 1080x1080.
- `logo-preview-sheet.png`: ringkasan visual semua variasi logo.
- `logo-usage.css`: helper CSS untuk memakai logo di website.

## Kapan Memakai Logo Putih

Gunakan logo putih untuk background gelap, foto gelap, navbar gelap, footer gelap, dan desain premium dengan warna hijau gelap atau hitam.

Contoh:

```html
<img src="/brand/debroder/logo-primary-white.png" alt="DEBRODER" class="brand-logo brand-logo-white">
```

## Kapan Memakai Logo Hitam

Gunakan logo hitam untuk background putih, abu-abu terang, halaman katalog, invoice, presentasi terang, atau area yang membutuhkan kontras tinggi.

Contoh:

```html
<img src="/brand/debroder/logo-primary-black.png" alt="DEBRODER" class="brand-logo brand-logo-black">
```

## Kapan Memakai Symbol Only

Gunakan symbol only untuk favicon, app icon, avatar sosial, tombol kecil, loading mark, watermark kecil, atau area sempit yang tidak cukup untuk logo lengkap.

Contoh:

```html
<img src="/brand/debroder/logo-symbol-black.png" alt="DEBRODER symbol" class="brand-symbol">
```

## Kapan Memakai Wordmark Only

Gunakan wordmark only saat ruang vertikal terbatas, misalnya navbar tipis, label produk, header dokumen, atau layout yang membutuhkan teks brand tanpa simbol.

Contoh:

```html
<img src="/brand/debroder/logo-wordmark-white.png" alt="DEBRODER" class="brand-wordmark">
```

## HTML

Tambahkan stylesheet:

```html
<link rel="stylesheet" href="/brand/debroder/logo-usage.css">
```

Contoh navbar gelap:

```html
<nav class="site-navbar">
  <a href="/" aria-label="DEBRODER home">
    <img src="/brand/debroder/logo-primary-white.png" alt="DEBRODER" class="brand-logo brand-logo-white">
  </a>
</nav>
```

Contoh favicon dan app icon:

```html
<link rel="icon" href="/brand/debroder/favicon.ico">
<link rel="icon" type="image/png" sizes="32x32" href="/brand/debroder/favicon-32x32.png">
<link rel="apple-touch-icon" sizes="180x180" href="/brand/debroder/apple-touch-icon.png">
```

Contoh Open Graph:

```html
<meta property="og:image" content="/brand/debroder/open-graph-logo.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
```

## React atau Next.js

Gunakan path dari folder `public`, tanpa menulis `/public` di URL:

```tsx
export function BrandLogo() {
  return (
    <img
      src="/brand/debroder/logo-primary-white.png"
      alt="DEBRODER"
      className="brand-logo brand-logo-white"
    />
  );
}
```

Untuk Next.js `Image`:

```tsx
import Image from "next/image";

export function BrandLogo() {
  return (
    <Image
      src="/brand/debroder/logo-primary-white.png"
      alt="DEBRODER"
      width={2048}
      height={1180}
      className="brand-logo brand-logo-white"
      priority
    />
  );
}
```

## Catatan Teknis

Logo utama dipertahankan dari sumber asli. Versi SVG dibuat sebagai fallback berbasis PNG transparan ter-embed agar bentuk, proporsi, dan komposisi tetap setia pada logo sumber.
