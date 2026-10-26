# DEBRODER Visual Asset Inventory

**Audit checkpoint:** 2026-10-22 (Asia/Makassar)
**Scope:** static image/media files under `public/` and source-level references found in `app/`, `components/`, `src/`, and `lib/`. Dynamic CMS/Supabase media is outside this checkout inventory.

## Summary

- Recognized assets: **242** (85 SVG, 157 raster including ICO).
- Product source photos: **101** in `public/product-images-source/`: CREWNEK 12, HODDIE 16, KAOS LENGAN PANJANG 34, KAOS POLOS 21, POLO 18.
- Product display photos: **21** in `public/products/`: Crewneck fronts 12, other apparel primary images 7, custom jersey images 2.
- Static decoding: all raster assets opened and verified; all SVG files parsed. No unreadable file was found.
- Browser/network broken-image checks and live CMS media reads were not run.
- Repository does not prove supplier, photographer, or license provenance for product source photos. Confirm with owner/PIM before publication.

## Directory inventory

| Directory | Files | Bytes |
|---|---:|---:|
| `public/brand/admin/` | 15 | 11,815 |
| `public/brand/commerce/` | 10 | 7,809 |
| `public/brand/debroder/` | 4 | 256,196 |
| `public/brand/filters/` | 10 | 3,116 |
| `public/brand/media/` | 8 | 4,401 |
| `public/brand/navigation/` | 14 | 5,551 |
| `public/brand/social/` | 5 | 16,910 |
| `public/brand/website/` | 11 | 9,199 |
| `public/debroder/` | 41 | 3,928,414 |
| `public/images/size-guide/` | 2 | 2,040 |
| `public/product-images-source/CREWNEK/` | 12 | 439,538 |
| `public/product-images-source/HODDIE/` | 16 | 636,890 |
| `public/product-images-source/KAOS LENGAN PANJANG/` | 34 | 1,078,724 |
| `public/product-images-source/KAOS POLOS/` | 21 | 345,904 |
| `public/product-images-source/POLO/` | 18 | 293,044 |
| `public/products/3600-soft-tee/` | 1 | 8,696 |
| `public/products/72y00-youth/` | 1 | 33,310 |
| `public/products/8100-polo/` | 1 | 7,798 |
| `public/products/bomber-jacket/` | 1 | 42,768 |
| `public/products/crewneck/` | 12 | 439,538 |
| `public/products/jersey-futsal-custom/` | 1 | 175,015 |
| `public/products/jersey-sepak-bola-custom/` | 1 | 209,130 |
| `public/products/pullover-hooded/` | 1 | 27,184 |
| `public/products/windbreaker/` | 1 | 39,194 |
| `public/products/zip-hooded/` | 1 | 55,846 |

## Asset-by-asset index

Dimensions are width × height in pixels; bytes are exact file sizes. Paths are repository-relative. “Source staging” does not assert license or approval for public use.

| File | Format | Dimensions | Bytes | Observed role / provenance status |
|---|---|---:|---:|---|
| `public/brand/admin/copy.svg` | SVG | 24×24; viewBox 0 0 24 24 | 386 | Brand/UI asset; owner repository |
| `public/brand/admin/database.svg` | SVG | 24×24; viewBox 0 0 24 24 | 622 | Brand/UI asset; owner repository |
| `public/brand/admin/download.svg` | SVG | 24×24; viewBox 0 0 24 24 | 387 | Brand/UI asset; owner repository |
| `public/brand/admin/file.svg` | SVG | 24×24; viewBox 0 0 24 24 | 716 | Brand/UI asset; owner repository |
| `public/brand/admin/folder-open.svg` | SVG | 24×24; viewBox 0 0 24 24 | 1,064 | Brand/UI asset; owner repository |
| `public/brand/admin/folder.svg` | SVG | 24×24; viewBox 0 0 24 24 | 698 | Brand/UI asset; owner repository |
| `public/brand/admin/layout-dashboard.svg` | SVG | 24×24; viewBox 0 0 24 24 | 968 | Brand/UI asset; owner repository |
| `public/brand/admin/lock-open.svg` | SVG | 24×24; viewBox 0 0 24 24 | 522 | Brand/UI asset; owner repository |
| `public/brand/admin/lock.svg` | SVG | 24×24; viewBox 0 0 24 24 | 480 | Brand/UI asset; owner repository |
| `public/brand/admin/save.svg` | SVG | 24×24; viewBox 0 0 24 24 | 774 | Brand/UI asset; owner repository |
| `public/brand/admin/settings.svg` | SVG | 24×24; viewBox 0 0 24 24 | 2,664 | Brand/UI asset; owner repository |
| `public/brand/admin/shield.svg` | SVG | 24×24; viewBox 0 0 24 24 | 638 | Brand/UI asset; owner repository |
| `public/brand/admin/square-pen.svg` | SVG | 24×24; viewBox 0 0 24 24 | 987 | Brand/UI asset; owner repository |
| `public/brand/admin/trash.svg` | SVG | 24×24; viewBox 0 0 24 24 | 525 | Brand/UI asset; owner repository |
| `public/brand/admin/upload.svg` | SVG | 24×24; viewBox 0 0 24 24 | 384 | Brand/UI asset; owner repository |
| `public/brand/commerce/bookmark.svg` | SVG | 24×24; viewBox 0 0 24 24 | 841 | Brand/UI asset; owner repository |
| `public/brand/commerce/credit-card.svg` | SVG | 24×24; viewBox 0 0 24 24 | 325 | Brand/UI asset; owner repository |
| `public/brand/commerce/gift.svg` | SVG | 24×24; viewBox 0 0 24 24 | 1,074 | Brand/UI asset; owner repository |
| `public/brand/commerce/heart.svg` | SVG | 24×24; viewBox 0 0 24 24 | 1,026 | Brand/UI asset; owner repository |
| `public/brand/commerce/package.svg` | SVG | 24×24; viewBox 0 0 24 24 | 845 | Brand/UI asset; owner repository |
| `public/brand/commerce/share.svg` | SVG | 24×24; viewBox 0 0 24 24 | 384 | Brand/UI asset; owner repository |
| `public/brand/commerce/shopping-bag.svg` | SVG | 24×24; viewBox 0 0 24 24 | 794 | Brand/UI asset; owner repository |
| `public/brand/commerce/shopping-cart.svg` | SVG | 24×24; viewBox 0 0 24 24 | 764 | Brand/UI asset; owner repository |
| `public/brand/commerce/ticket-percent.svg` | SVG | 24×24; viewBox 0 0 24 24 | 842 | Brand/UI asset; owner repository |
| `public/brand/commerce/truck.svg` | SVG | 24×24; viewBox 0 0 24 24 | 914 | Brand/UI asset; owner repository |
| `public/brand/debroder/logo-symbol-black.svg` | SVG | 1024×898; viewBox 0 0 1024 898 | 75,561 | Brand/UI asset; owner repository |
| `public/brand/debroder/logo-symbol-white.svg` | SVG | 1024×898; viewBox 0 0 1024 898 | 82,529 | Brand/UI asset; owner repository |
| `public/brand/debroder/logo-wordmark-black.svg` | SVG | 2048×329; viewBox 0 0 2048 329 | 47,295 | Brand/UI asset; owner repository |
| `public/brand/debroder/logo-wordmark-white.svg` | SVG | 2048×329; viewBox 0 0 2048 329 | 50,811 | Brand/UI asset; owner repository |
| `public/brand/filters/check.svg` | SVG | 24×24; viewBox 0 0 24 24 | 213 | Brand/UI asset; owner repository |
| `public/brand/filters/circle-check.svg` | SVG | 24×24; viewBox 0 0 24 24 | 328 | Brand/UI asset; owner repository |
| `public/brand/filters/circle.svg` | SVG | 24×24; viewBox 0 0 24 24 | 311 | Brand/UI asset; owner repository |
| `public/brand/filters/list-sort-ascending.svg` | SVG | 24×24; viewBox 0 0 24 24 | 220 | Brand/UI asset; owner repository |
| `public/brand/filters/list-sort-descending.svg` | SVG | 24×24; viewBox 0 0 24 24 | 220 | Brand/UI asset; owner repository |
| `public/brand/filters/loader-circle.svg` | SVG | 24×24; viewBox 0 0 24 24 | 578 | Brand/UI asset; owner repository |
| `public/brand/filters/minus.svg` | SVG | 24×24; viewBox 0 0 24 24 | 206 | Brand/UI asset; owner repository |
| `public/brand/filters/plus.svg` | SVG | 24×24; viewBox 0 0 24 24 | 214 | Brand/UI asset; owner repository |
| `public/brand/filters/rotate-ccw.svg` | SVG | 24×24; viewBox 0 0 24 24 | 608 | Brand/UI asset; owner repository |
| `public/brand/filters/x.svg` | SVG | 24×24; viewBox 0 0 24 24 | 218 | Brand/UI asset; owner repository |
| `public/brand/media/circle-pause.svg` | SVG | 24×24; viewBox 0 0 24 24 | 327 | Brand/UI asset; owner repository |
| `public/brand/media/external-link.svg` | SVG | 24×24; viewBox 0 0 24 24 | 457 | Brand/UI asset; owner repository |
| `public/brand/media/film.svg` | SVG | 24×24; viewBox 0 0 24 24 | 378 | Brand/UI asset; owner repository |
| `public/brand/media/image.svg` | SVG | 24×24; viewBox 0 0 24 24 | 541 | Brand/UI asset; owner repository |
| `public/brand/media/link-2.svg` | SVG | 24×24; viewBox 0 0 24 24 | 523 | Brand/UI asset; owner repository |
| `public/brand/media/monitor.svg` | SVG | 24×24; viewBox 0 0 24 24 | 334 | Brand/UI asset; owner repository |
| `public/brand/media/play.svg` | SVG | 24×24; viewBox 0 0 24 24 | 795 | Brand/UI asset; owner repository |
| `public/brand/media/volume-1.svg` | SVG | 24×24; viewBox 0 0 24 24 | 1,046 | Brand/UI asset; owner repository |
| `public/brand/navigation/arrow-down.svg` | SVG | 24×24; viewBox 0 0 24 24 | 223 | Brand/UI asset; owner repository |
| `public/brand/navigation/arrow-left.svg` | SVG | 24×24; viewBox 0 0 24 24 | 222 | Brand/UI asset; owner repository |
| `public/brand/navigation/arrow-right.svg` | SVG | 24×24; viewBox 0 0 24 24 | 223 | Brand/UI asset; owner repository |
| `public/brand/navigation/arrow-up.svg` | SVG | 24×24; viewBox 0 0 24 24 | 222 | Brand/UI asset; owner repository |
| `public/brand/navigation/between-vertical-end.svg` | SVG | 24×24; viewBox 0 0 24 24 | 457 | Brand/UI asset; owner repository |
| `public/brand/navigation/between-vertical-start.svg` | SVG | 24×24; viewBox 0 0 24 24 | 454 | Brand/UI asset; owner repository |
| `public/brand/navigation/grid-2x2-check.svg` | SVG | 24×24; viewBox 0 0 24 24 | 642 | Brand/UI asset; owner repository |
| `public/brand/navigation/grid-2x2-plus.svg` | SVG | 24×24; viewBox 0 0 24 24 | 642 | Brand/UI asset; owner repository |
| `public/brand/navigation/grid-2x2.svg` | SVG | 24×24; viewBox 0 0 24 24 | 333 | Brand/UI asset; owner repository |
| `public/brand/navigation/grid-3x3.svg` | SVG | 24×24; viewBox 0 0 24 24 | 347 | Brand/UI asset; owner repository |
| `public/brand/navigation/menu.svg` | SVG | 24×24; viewBox 0 0 24 24 | 221 | Brand/UI asset; owner repository |
| `public/brand/navigation/search.svg` | SVG | 24×24; viewBox 0 0 24 24 | 329 | Brand/UI asset; owner repository |
| `public/brand/navigation/shopping-cart.svg` | SVG | 24×24; viewBox 0 0 24 24 | 764 | Brand/UI asset; owner repository |
| `public/brand/navigation/user.svg` | SVG | 24×24; viewBox 0 0 24 24 | 472 | Brand/UI asset; owner repository |
| `public/brand/social/email.svg` | SVG | 24×24; viewBox 0 0 24 24 | 430 | Brand/UI asset; owner repository |
| `public/brand/social/INSTAGRAM ON DARK.svg` | SVG | 1024×1024; viewBox 0 0 768 767.999994 | 4,616 | Brand/UI asset; owner repository |
| `public/brand/social/instagram.svg` | SVG | 1024×1024; viewBox 0 0 768 767.999994 | 5,737 | Brand/UI asset; owner repository |
| `public/brand/social/WA ON DARK.svg` | SVG | 1024×1024; viewBox 0 0 768 767.999994 | 3,068 | Brand/UI asset; owner repository |
| `public/brand/social/whatsapp.svg` | SVG | 1024×1024; viewBox 0 0 768 767.999994 | 3,059 | Brand/UI asset; owner repository |
| `public/brand/website/bell.svg` | SVG | 24×24; viewBox 0 0 24 24 | 965 | Brand/UI asset; owner repository |
| `public/brand/website/bookmark.svg` | SVG | 24×24; viewBox 0 0 24 24 | 841 | Brand/UI asset; owner repository |
| `public/brand/website/ellipsis-vertical.svg` | SVG | 24×24; viewBox 0 0 24 24 | 732 | Brand/UI asset; owner repository |
| `public/brand/website/ellipsis.svg` | SVG | 24×24; viewBox 0 0 24 24 | 732 | Brand/UI asset; owner repository |
| `public/brand/website/eye-off.svg` | SVG | 24×24; viewBox 0 0 24 24 | 900 | Brand/UI asset; owner repository |
| `public/brand/website/eye.svg` | SVG | 24×24; viewBox 0 0 24 24 | 912 | Brand/UI asset; owner repository |
| `public/brand/website/info.svg` | SVG | 24×24; viewBox 0 0 24 24 | 331 | Brand/UI asset; owner repository |
| `public/brand/website/loader-circle.svg` | SVG | 24×24; viewBox 0 0 24 24 | 575 | Brand/UI asset; owner repository |
| `public/brand/website/message-circle-question-mark.svg` | SVG | 24×24; viewBox 0 0 24 24 | 1,188 | Brand/UI asset; owner repository |
| `public/brand/website/move-horizontal.svg` | SVG | 24×24; viewBox 0 0 24 24 | 237 | Brand/UI asset; owner repository |
| `public/brand/website/star.svg` | SVG | 24×24; viewBox 0 0 24 24 | 1,786 | Brand/UI asset; owner repository |
| `public/debroder/android-chrome-192x192.png` | PNG | 192×192 | 9,054 | Inspect source/runtime use |
| `public/debroder/android-chrome-512x512.png` | PNG | 512×512 | 27,813 | Inspect source/runtime use |
| `public/debroder/apple-touch-icon.png` | PNG | 180×180 | 8,407 | Inspect source/runtime use |
| `public/debroder/favicon-16x16.png` | PNG | 16×16 | 477 | Brand/UI asset; owner repository |
| `public/debroder/favicon-32x32.png` | PNG | 32×32 | 1,125 | Brand/UI asset; owner repository |
| `public/debroder/favicon-48x48.png` | PNG | 48×48 | 1,956 | Brand/UI asset; owner repository |
| `public/debroder/favicon.ico` | ICO | 256×256 | 32,055 | Brand/UI asset; owner repository |
| `public/debroder/favicon.png` | PNG | 512×512 | 27,813 | Brand/UI asset; owner repository |
| `public/debroder/logo-debroder-dark.png` | PNG | 2048×2020 | 172,904 | Brand/UI asset; owner repository |
| `public/debroder/logo-debroder-symbol-dark.png` | PNG | 512×512 | 27,813 | Brand/UI asset; owner repository |
| `public/debroder/logo-debroder-symbol-white.png` | PNG | 512×512 | 27,451 | Brand/UI asset; owner repository |
| `public/debroder/logo-debroder-symbol.svg` | SVG | ?×?; viewBox 0 0 416.0577 346.3648 | 3,091 | Brand/UI asset; owner repository |
| `public/debroder/logo-debroder-white.png` | PNG | 2048×2020 | 169,926 | Brand/UI asset; owner repository |
| `public/debroder/logo-debroder.svg` | SVG | ?×?; viewBox 0 0 445.7225 439.6034 | 6,466 | Brand/UI asset; owner repository |
| `public/debroder/logo-primary-black-1024.png` | PNG | 1024×590 | 40,430 | Brand/UI asset; owner repository |
| `public/debroder/logo-primary-black-2048.png` | PNG | 2048×1180 | 95,344 | Brand/UI asset; owner repository |
| `public/debroder/logo-primary-black-4096.png` | PNG | 4096×2361 | 244,728 | Brand/UI asset; owner repository |
| `public/debroder/logo-primary-black-512.png` | PNG | 512×295 | 18,069 | Brand/UI asset; owner repository |
| `public/debroder/logo-primary-black-7680.png` | PNG | 7680×4427 | 675,212 | Brand/UI asset; owner repository |
| `public/debroder/logo-primary-black.png` | PNG | 2048×1180 | 95,344 | Brand/UI asset; owner repository |
| `public/debroder/logo-primary-black.svg` | SVG | 2048×1180; viewBox 0 0 2048 1180 | 127,350 | Brand/UI asset; owner repository |
| `public/debroder/logo-primary-dark-bg.png` | PNG | 1600×900 | 92,926 | Brand/UI asset; owner repository |
| `public/debroder/logo-primary-white-1024.png` | PNG | 1024×590 | 45,445 | Brand/UI asset; owner repository |
| `public/debroder/logo-primary-white-2048.png` | PNG | 2048×1180 | 104,504 | Brand/UI asset; owner repository |
| `public/debroder/logo-primary-white-4096.png` | PNG | 4096×2361 | 263,741 | Brand/UI asset; owner repository |
| `public/debroder/logo-primary-white-512.png` | PNG | 512×295 | 20,866 | Brand/UI asset; owner repository |
| `public/debroder/logo-primary-white-7680.png` | PNG | 7680×4427 | 722,331 | Brand/UI asset; owner repository |
| `public/debroder/logo-primary-white.png` | PNG | 2048×1180 | 104,504 | Brand/UI asset; owner repository |
| `public/debroder/logo-primary-white.svg` | SVG | 2048×1180; viewBox 0 0 2048 1180 | 139,562 | Brand/UI asset; owner repository |
| `public/debroder/logo-symbol-black.png` | PNG | 1024×898 | 56,510 | Brand/UI asset; owner repository |
| `public/debroder/logo-symbol-black.svg` | SVG | 1024×898; viewBox 0 0 1024 898 | 75,561 | Brand/UI asset; owner repository |
| `public/debroder/logo-symbol-white.png` | PNG | 1024×898 | 61,736 | Brand/UI asset; owner repository |
| `public/debroder/logo-symbol-white.svg` | SVG | 1024×898; viewBox 0 0 1024 898 | 82,529 | Brand/UI asset; owner repository |
| `public/debroder/logo-wordmark-black.png` | PNG | 2048×329 | 35,309 | Brand/UI asset; owner repository |
| `public/debroder/logo-wordmark-black.svg` | SVG | 2048×329; viewBox 0 0 2048 329 | 47,295 | Brand/UI asset; owner repository |
| `public/debroder/logo-wordmark-white.png` | PNG | 2048×329 | 37,945 | Brand/UI asset; owner repository |
| `public/debroder/logo-wordmark-white.svg` | SVG | 2048×329; viewBox 0 0 2048 329 | 50,811 | Brand/UI asset; owner repository |
| `public/debroder/open-graph-logo.png` | PNG | 1200×630 | 45,587 | Social/metadata fallback; owner repository |
| `public/debroder/social-preview.png` | PNG | 1080×1080 | 91,557 | Social/metadata fallback; owner repository |
| `public/debroder/web-app-icon-192.png` | PNG | 192×192 | 9,054 | Inspect source/runtime use |
| `public/debroder/web-app-icon-512.png` | PNG | 512×512 | 27,813 | Inspect source/runtime use |
| `public/images/size-guide/kaos-lengan-panjang.webp` | WEBP | 361×289 | 998 | Size guide illustration; owner repository |
| `public/images/size-guide/kaos-lengan-pendek.webp` | WEBP | 321×288 | 1,042 | Size guide illustration; owner repository |
| `public/product-images-source/CREWNEK/118-Army.webp` | WEBP | 421×551 | 32,318 | PIM/source staging; identity/licence not proven here |
| `public/product-images-source/CREWNEK/118-Black Camo.webp` | WEBP | 421×551 | 53,276 | PIM/source staging; identity/licence not proven here |
| `public/product-images-source/CREWNEK/118-Black.webp` | WEBP | 421×551 | 19,936 | PIM/source staging; identity/licence not proven here |
| `public/product-images-source/CREWNEK/118-Forest Camo.webp` | WEBP | 421×551 | 62,214 | PIM/source staging; identity/licence not proven here |
| `public/product-images-source/CREWNEK/118-Forest Green.webp` | WEBP | 421×551 | 27,918 | PIM/source staging; identity/licence not proven here |
| `public/product-images-source/CREWNEK/118-Light Pink.webp` | WEBP | 421×551 | 29,866 | PIM/source staging; identity/licence not proven here |
| `public/product-images-source/CREWNEK/118-Maroon.webp` | WEBP | 421×551 | 40,422 | PIM/source staging; identity/licence not proven here |
| `public/product-images-source/CREWNEK/118-Navy.webp` | WEBP | 421×551 | 29,988 | PIM/source staging; identity/licence not proven here |
| `public/product-images-source/CREWNEK/118-Red.webp` | WEBP | 421×551 | 31,700 | PIM/source staging; identity/licence not proven here |
| `public/product-images-source/CREWNEK/118-Royal Blue.webp` | WEBP | 421×551 | 25,190 | PIM/source staging; identity/licence not proven here |
| `public/product-images-source/CREWNEK/118-Sport Grey.webp` | WEBP | 421×551 | 61,674 | PIM/source staging; identity/licence not proven here |
| `public/product-images-source/CREWNEK/118-White.webp` | WEBP | 421×551 | 25,036 | PIM/source staging; identity/licence not proven here |
| `public/product-images-source/HODDIE/103-Army.webp` | WEBP | 421×551 | 39,960 | PIM/source staging; identity/licence not proven here |
| `public/product-images-source/HODDIE/103-Black Camo.webp` | WEBP | 421×551 | 42,768 | PIM/source staging; identity/licence not proven here |
| `public/product-images-source/HODDIE/103-Black.webp` | WEBP | 421×551 | 27,184 | PIM/source staging; identity/licence not proven here |
| `public/product-images-source/HODDIE/103-Forest Camo.webp` | WEBP | 421×551 | 52,450 | PIM/source staging; identity/licence not proven here |
| `public/product-images-source/HODDIE/103-Forest Green.webp` | WEBP | 421×551 | 35,828 | PIM/source staging; identity/licence not proven here |
| `public/product-images-source/HODDIE/103-Gold.webp` | WEBP | 421×551 | 40,340 | PIM/source staging; identity/licence not proven here |
| `public/product-images-source/HODDIE/103-Light Blue.webp` | WEBP | 421×551 | 42,432 | PIM/source staging; identity/licence not proven here |
| `public/product-images-source/HODDIE/103-Light Pink.webp` | WEBP | 421×551 | 38,648 | PIM/source staging; identity/licence not proven here |
| `public/product-images-source/HODDIE/103-Lilac (1).webp` | WEBP | 421×551 | 32,714 | PIM/source staging; identity/licence not proven here |
| `public/product-images-source/HODDIE/103-Lilac.webp` | WEBP | 421×551 | 32,714 | PIM/source staging; identity/licence not proven here |
| `public/product-images-source/HODDIE/103-Maroon.webp` | WEBP | 421×551 | 44,622 | PIM/source staging; identity/licence not proven here |
| `public/product-images-source/HODDIE/103-Navy.webp` | WEBP | 421×551 | 39,194 | PIM/source staging; identity/licence not proven here |
| `public/product-images-source/HODDIE/103-Red.webp` | WEBP | 421×551 | 38,716 | PIM/source staging; identity/licence not proven here |
| `public/product-images-source/HODDIE/103-Royal Blue.webp` | WEBP | 421×551 | 45,376 | PIM/source staging; identity/licence not proven here |
| `public/product-images-source/HODDIE/103-Sport Grey.webp` | WEBP | 421×551 | 55,846 | PIM/source staging; identity/licence not proven here |
| `public/product-images-source/HODDIE/103-White.webp` | WEBP | 421×551 | 28,098 | PIM/source staging; identity/licence not proven here |
| `public/product-images-source/KAOS LENGAN PANJANG/94-Aqua Sky.webp` | WEBP | 421×551 | 31,172 | PIM/source staging; identity/licence not proven here |
| `public/product-images-source/KAOS LENGAN PANJANG/94-Black Heather.webp` | WEBP | 421×551 | 51,678 | PIM/source staging; identity/licence not proven here |
| `public/product-images-source/KAOS LENGAN PANJANG/94-Black.webp` | WEBP | 421×551 | 16,128 | PIM/source staging; identity/licence not proven here |
| `public/product-images-source/KAOS LENGAN PANJANG/94-Burgundy Heather.webp` | WEBP | 421×551 | 48,806 | PIM/source staging; identity/licence not proven here |
| `public/product-images-source/KAOS LENGAN PANJANG/94-Butter.webp` | WEBP | 421×551 | 20,886 | PIM/source staging; identity/licence not proven here |
| `public/product-images-source/KAOS LENGAN PANJANG/94-Carolina Blue.webp` | WEBP | 421×551 | 31,910 | PIM/source staging; identity/licence not proven here |
| `public/product-images-source/KAOS LENGAN PANJANG/94-Charcoal.webp` | WEBP | 421×551 | 13,616 | PIM/source staging; identity/licence not proven here |
| `public/product-images-source/KAOS LENGAN PANJANG/94-Chestnut.webp` | WEBP | 421×551 | 26,780 | PIM/source staging; identity/licence not proven here |
| `public/product-images-source/KAOS LENGAN PANJANG/94-Daisy.webp` | WEBP | 421×551 | 29,782 | PIM/source staging; identity/licence not proven here |
| `public/product-images-source/KAOS LENGAN PANJANG/94-Dark Chocolate.webp` | WEBP | 421×551 | 24,614 | PIM/source staging; identity/licence not proven here |
| `public/product-images-source/KAOS LENGAN PANJANG/94-Dark Green Heather.webp` | WEBP | 421×551 | 47,174 | PIM/source staging; identity/licence not proven here |
| `public/product-images-source/KAOS LENGAN PANJANG/94-Forest Green.webp` | WEBP | 421×551 | 21,742 | PIM/source staging; identity/licence not proven here |
| `public/product-images-source/KAOS LENGAN PANJANG/94-Gold.webp` | WEBP | 421×551 | 23,832 | PIM/source staging; identity/licence not proven here |
| `public/product-images-source/KAOS LENGAN PANJANG/94-Green Ash.webp` | WEBP | 421×551 | 35,484 | PIM/source staging; identity/licence not proven here |
| `public/product-images-source/KAOS LENGAN PANJANG/94-Heliconia.webp` | WEBP | 421×551 | 27,442 | PIM/source staging; identity/licence not proven here |
| `public/product-images-source/KAOS LENGAN PANJANG/94-Irish Green.webp` | WEBP | 421×551 | 39,324 | PIM/source staging; identity/licence not proven here |
| `public/product-images-source/KAOS LENGAN PANJANG/94-Light Pink.webp` | WEBP | 421×551 | 21,512 | PIM/source staging; identity/licence not proven here |
| `public/product-images-source/KAOS LENGAN PANJANG/94-Lilac.webp` | WEBP | 421×551 | 33,424 | PIM/source staging; identity/licence not proven here |
| `public/product-images-source/KAOS LENGAN PANJANG/94-Lime.webp` | WEBP | 421×551 | 19,344 | PIM/source staging; identity/licence not proven here |
| `public/product-images-source/KAOS LENGAN PANJANG/94-Maroon.webp` | WEBP | 421×551 | 33,356 | PIM/source staging; identity/licence not proven here |
| `public/product-images-source/KAOS LENGAN PANJANG/94-Military Green.webp` | WEBP | 421×551 | 35,264 | PIM/source staging; identity/licence not proven here |
| `public/product-images-source/KAOS LENGAN PANJANG/94-Mustard.webp` | WEBP | 421×551 | 18,268 | PIM/source staging; identity/licence not proven here |
| `public/product-images-source/KAOS LENGAN PANJANG/94-Navy Heather.webp` | WEBP | 421×551 | 44,690 | PIM/source staging; identity/licence not proven here |
| `public/product-images-source/KAOS LENGAN PANJANG/94-Navy.webp` | WEBP | 421×551 | 25,622 | PIM/source staging; identity/licence not proven here |
| `public/product-images-source/KAOS LENGAN PANJANG/94-Orange.webp` | WEBP | 421×551 | 37,782 | PIM/source staging; identity/licence not proven here |
| `public/product-images-source/KAOS LENGAN PANJANG/94-Purple.webp` | WEBP | 421×551 | 24,742 | PIM/source staging; identity/licence not proven here |
| `public/product-images-source/KAOS LENGAN PANJANG/94-Red Heather.webp` | WEBP | 421×551 | 59,730 | PIM/source staging; identity/licence not proven here |
| `public/product-images-source/KAOS LENGAN PANJANG/94-Red.webp` | WEBP | 421×551 | 30,118 | PIM/source staging; identity/licence not proven here |
| `public/product-images-source/KAOS LENGAN PANJANG/94-Royal Blue.webp` | WEBP | 421×551 | 33,926 | PIM/source staging; identity/licence not proven here |
| `public/product-images-source/KAOS LENGAN PANJANG/94-Salmon.webp` | WEBP | 421×551 | 40,650 | PIM/source staging; identity/licence not proven here |
| `public/product-images-source/KAOS LENGAN PANJANG/94-Sand.webp` | WEBP | 421×551 | 25,674 | PIM/source staging; identity/licence not proven here |
| `public/product-images-source/KAOS LENGAN PANJANG/94-Sapphire.webp` | WEBP | 421×551 | 33,176 | PIM/source staging; identity/licence not proven here |
| `public/product-images-source/KAOS LENGAN PANJANG/94-Sport Grey.webp` | WEBP | 421×551 | 58,706 | PIM/source staging; identity/licence not proven here |
| `public/product-images-source/KAOS LENGAN PANJANG/94-White.webp` | WEBP | 421×551 | 12,370 | PIM/source staging; identity/licence not proven here |
| `public/product-images-source/KAOS POLOS/87-Black.webp` | WEBP | 421×551 | 8,696 | PIM/source staging; identity/licence not proven here |
| `public/product-images-source/KAOS POLOS/87-Carolina Blue.webp` | WEBP | 421×551 | 20,298 | PIM/source staging; identity/licence not proven here |
| `public/product-images-source/KAOS POLOS/87-Charcoal.webp` | WEBP | 421×551 | 14,752 | PIM/source staging; identity/licence not proven here |
| `public/product-images-source/KAOS POLOS/87-Daisy.webp` | WEBP | 421×551 | 13,220 | PIM/source staging; identity/licence not proven here |
| `public/product-images-source/KAOS POLOS/87-Dark Chocolate.webp` | WEBP | 421×551 | 12,890 | PIM/source staging; identity/licence not proven here |
| `public/product-images-source/KAOS POLOS/87-Forest Green.webp` | WEBP | 421×551 | 11,380 | PIM/source staging; identity/licence not proven here |
| `public/product-images-source/KAOS POLOS/87-Gold.webp` | WEBP | 421×551 | 15,358 | PIM/source staging; identity/licence not proven here |
| `public/product-images-source/KAOS POLOS/87-Heliconia.webp` | WEBP | 421×551 | 11,730 | PIM/source staging; identity/licence not proven here |
| `public/product-images-source/KAOS POLOS/87-Irish Green.webp` | WEBP | 421×551 | 15,588 | PIM/source staging; identity/licence not proven here |
| `public/product-images-source/KAOS POLOS/87-Lilac.webp` | WEBP | 421×551 | 13,502 | PIM/source staging; identity/licence not proven here |
| `public/product-images-source/KAOS POLOS/87-Lime.webp` | WEBP | 421×551 | 9,640 | PIM/source staging; identity/licence not proven here |
| `public/product-images-source/KAOS POLOS/87-Maroon.webp` | WEBP | 421×551 | 21,660 | PIM/source staging; identity/licence not proven here |
| `public/product-images-source/KAOS POLOS/87-Navy.webp` | WEBP | 421×551 | 14,238 | PIM/source staging; identity/licence not proven here |
| `public/product-images-source/KAOS POLOS/87-Orange.webp` | WEBP | 421×551 | 16,884 | PIM/source staging; identity/licence not proven here |
| `public/product-images-source/KAOS POLOS/87-Red.webp` | WEBP | 421×551 | 14,118 | PIM/source staging; identity/licence not proven here |
| `public/product-images-source/KAOS POLOS/87-Royal Blue.webp` | WEBP | 421×551 | 19,490 | PIM/source staging; identity/licence not proven here |
| `public/product-images-source/KAOS POLOS/87-Sand.webp` | WEBP | 421×551 | 9,322 | PIM/source staging; identity/licence not proven here |
| `public/product-images-source/KAOS POLOS/87-Sapphire.webp` | WEBP | 421×551 | 20,458 | PIM/source staging; identity/licence not proven here |
| `public/product-images-source/KAOS POLOS/87-Sport Grey.webp` | WEBP | 421×551 | 43,570 | PIM/source staging; identity/licence not proven here |
| `public/product-images-source/KAOS POLOS/87-White.webp` | WEBP | 421×551 | 5,800 | PIM/source staging; identity/licence not proven here |
| `public/product-images-source/KAOS POLOS/96-Sport Grey.webp` | WEBP | 384×503 | 33,310 | PIM/source staging; identity/licence not proven here |
| `public/product-images-source/POLO/139-Black.webp` | WEBP | 421×551 | 7,798 | PIM/source staging; identity/licence not proven here |
| `public/product-images-source/POLO/139-Carolina Blue.webp` | WEBP | 421×551 | 19,524 | PIM/source staging; identity/licence not proven here |
| `public/product-images-source/POLO/139-Charcoal.webp` | WEBP | 421×551 | 15,216 | PIM/source staging; identity/licence not proven here |
| `public/product-images-source/POLO/139-Daisy.webp` | WEBP | 421×551 | 19,282 | PIM/source staging; identity/licence not proven here |
| `public/product-images-source/POLO/139-Dark Chocolate.webp` | WEBP | 421×551 | 13,720 | PIM/source staging; identity/licence not proven here |
| `public/product-images-source/POLO/139-Forest Green.webp` | WEBP | 421×551 | 10,806 | PIM/source staging; identity/licence not proven here |
| `public/product-images-source/POLO/139-Gold.webp` | WEBP | 421×551 | 20,160 | PIM/source staging; identity/licence not proven here |
| `public/product-images-source/POLO/139-Irish Green.webp` | WEBP | 421×551 | 17,452 | PIM/source staging; identity/licence not proven here |
| `public/product-images-source/POLO/139-Light Pink.webp` | WEBP | 421×551 | 10,798 | PIM/source staging; identity/licence not proven here |
| `public/product-images-source/POLO/139-Maroon.webp` | WEBP | 421×551 | 15,834 | PIM/source staging; identity/licence not proven here |
| `public/product-images-source/POLO/139-Military Green.webp` | WEBP | 421×551 | 12,636 | PIM/source staging; identity/licence not proven here |
| `public/product-images-source/POLO/139-Navy.webp` | WEBP | 421×551 | 12,290 | PIM/source staging; identity/licence not proven here |
| `public/product-images-source/POLO/139-Orange.webp` | WEBP | 421×551 | 20,336 | PIM/source staging; identity/licence not proven here |
| `public/product-images-source/POLO/139-Red.webp` | WEBP | 421×551 | 16,386 | PIM/source staging; identity/licence not proven here |
| `public/product-images-source/POLO/139-Royal Blue.webp` | WEBP | 421×551 | 17,152 | PIM/source staging; identity/licence not proven here |
| `public/product-images-source/POLO/139-Sand.webp` | WEBP | 421×551 | 14,576 | PIM/source staging; identity/licence not proven here |
| `public/product-images-source/POLO/139-Sport Grey.webp` | WEBP | 421×551 | 39,228 | PIM/source staging; identity/licence not proven here |
| `public/product-images-source/POLO/139-White.webp` | WEBP | 421×551 | 9,850 | PIM/source staging; identity/licence not proven here |
| `public/products/3600-soft-tee/primary.webp` | WEBP | 421×551 | 8,696 | Static product asset; PIM/source ownership needs confirmation |
| `public/products/72y00-youth/primary.webp` | WEBP | 384×503 | 33,310 | Static product asset; PIM/source ownership needs confirmation |
| `public/products/8100-polo/primary.webp` | WEBP | 421×551 | 7,798 | Static product asset; PIM/source ownership needs confirmation |
| `public/products/bomber-jacket/primary.webp` | WEBP | 421×551 | 42,768 | Static product asset; PIM/source ownership needs confirmation |
| `public/products/crewneck/army/front.webp` | WEBP | 421×551 | 32,318 | Static product asset; PIM/source ownership needs confirmation |
| `public/products/crewneck/black/front.webp` | WEBP | 421×551 | 19,936 | Static product asset; PIM/source ownership needs confirmation |
| `public/products/crewneck/black-camo/front.webp` | WEBP | 421×551 | 53,276 | Static product asset; PIM/source ownership needs confirmation |
| `public/products/crewneck/forest-camo/front.webp` | WEBP | 421×551 | 62,214 | Static product asset; PIM/source ownership needs confirmation |
| `public/products/crewneck/forest-green/front.webp` | WEBP | 421×551 | 27,918 | Static product asset; PIM/source ownership needs confirmation |
| `public/products/crewneck/light-pink/front.webp` | WEBP | 421×551 | 29,866 | Static product asset; PIM/source ownership needs confirmation |
| `public/products/crewneck/maroon/front.webp` | WEBP | 421×551 | 40,422 | Static product asset; PIM/source ownership needs confirmation |
| `public/products/crewneck/navy/front.webp` | WEBP | 421×551 | 29,988 | Static product asset; PIM/source ownership needs confirmation |
| `public/products/crewneck/red/front.webp` | WEBP | 421×551 | 31,700 | Static product asset; PIM/source ownership needs confirmation |
| `public/products/crewneck/royal-blue/front.webp` | WEBP | 421×551 | 25,190 | Static product asset; PIM/source ownership needs confirmation |
| `public/products/crewneck/sport-grey/front.webp` | WEBP | 421×551 | 61,674 | Static product asset; PIM/source ownership needs confirmation |
| `public/products/crewneck/white/front.webp` | WEBP | 421×551 | 25,036 | Static product asset; PIM/source ownership needs confirmation |
| `public/products/jersey-futsal-custom/primary.jpeg` | JPEG | 828×1472 | 175,015 | Static product asset; PIM/source ownership needs confirmation |
| `public/products/jersey-sepak-bola-custom/primary.jpeg` | JPEG | 828×1472 | 209,130 | Static product asset; PIM/source ownership needs confirmation |
| `public/products/pullover-hooded/primary.webp` | WEBP | 421×551 | 27,184 | Static product asset; PIM/source ownership needs confirmation |
| `public/products/windbreaker/primary.webp` | WEBP | 421×551 | 39,194 | Static product asset; PIM/source ownership needs confirmation |
| `public/products/zip-hooded/primary.webp` | WEBP | 421×551 | 55,846 | Static product asset; PIM/source ownership needs confirmation |

## Source and usage notes

- `components/HeroSlider.tsx` consumes CMS `image_url` and `mobile_image_url`; missing media falls back to `/debroder/social-preview.png` (1080×1080), which is not a campaign master.
- Category hero media is passed from CMS-backed page data through `components/public/CategoryHero.tsx` and `components/PublicPage.tsx`. Static inventory cannot establish what is currently published remotely.
- Homepage editorial and campaign artwork is CMS-driven. Generic fallback files in `lib/fallback-data.ts` are not approved product or category photography.
- Static service/product examples reference `/products/...`; PIM-backed imagery can also come from remote storage and is not completely mapped by local file search.
- Source product photos are mostly 421×551 px; one is 384×503 px. Their ratio (~0.763–0.764) is near but not equal to 4:5 (0.8), and dimensions are below the blueprint 2000×2500 master.
- `logo-primary-black-7680.png` (675,212 bytes) and `logo-primary-white-7680.png` (722,331 bytes) are 7680×4427; review actual consumers before making optimized derivatives.
- Byte-identical groups include HODDIE Lilac/Lilac (1), 12 Crewneck source-to-display pairs, and several product display assets that duplicate named source photos. Keep these mappings for owner/PIM review.

## Visual acceptance boundary

This is a file and source-reference audit, not browser visual QA. Desktop/tablet/mobile crop, color accuracy, perceived sharpness at rendered size, LCP, CLS, live CMS publication, and remote-storage responses remain **NOT TESTED**. Do not activate or reassign an ambiguous source image based on this inventory alone.
