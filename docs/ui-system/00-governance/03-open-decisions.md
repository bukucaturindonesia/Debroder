# Open Decisions Registry

## Status

**BELUM FINAL REGISTRY**

## Purpose

Mencatat seluruh keputusan yang Master nyatakan belum final agar tidak diselesaikan sepihak.

## Canonical Source — Master §18

HEX resmi Hijau DEBRODER belum ditentukan dalam dokumen ini.

Saat HEX resmi dipilih, wajib dibuat token:

```text
Green 50
Green 100
Green 200
Green 300
Green 400
Green 500
Green 600
Green 700
Green 800
Green 900
Green 950
```

Beserta:

- hover;
- active;
- focus;
- soft surface;
- border;
- disabled;
- inverse.

Hal yang sama untuk neutral dan status.

**Catatan caution:** bagian ini belum final sampai HEX Hijau DEBRODER dikunci.

## Rule

Setiap item pada registry ini harus diperlakukan sebagai:

```text
⚠ BELUM FINAL — OWNER DECISION REQUIRED
```

Implementation guidance tidak boleh mengubah status tersebut menjadi CANONICAL atau OWNER LOCKED final value.

## OD-001 — Official Hijau DEBRODER HEX

**Status:** ⚠ BELUM FINAL — OWNER DECISION REQUIRED

Master §18 menyatakan HEX resmi Hijau DEBRODER belum ditentukan.

Dilarang:

- memilih HEX baru;
- mengambil warna existing code lalu menyatakannya canonical;
- mengunci warna dari screenshot;
- menganggap temporary token sebagai owner decision.

## OD-002 — Green 50–950 Scale

**Status:** ⚠ BELUM FINAL — OWNER DECISION REQUIRED

Master §18 meminta scale:

```text
Green 50
Green 100
Green 200
Green 300
Green 400
Green 500
Green 600
Green 700
Green 800
Green 900
Green 950
```

Beserta semantic variants:

- hover;
- active;
- focus;
- soft surface;
- border;
- disabled;
- inverse.

Nilai warna aktual belum boleh dibuat final.

## OD-003 — Final Icon Family

**Status:** ⚠ BELUM FINAL — OWNER DECISION REQUIRED

Master §81 mengunci kebutuhan **satu keluarga ikon konsisten** dan canonical sizes, tetapi Master §86 menyatakan final icon family belum final.

Implementation dapat memakai library sementara bila package lain memerlukan, tetapi tidak boleh menyatakannya canonical tanpa owner decision.

## OD-004 — Complete Responsive Matrix per Component

**Status:** ⚠ BELUM FINAL — OWNER DECISION REQUIRED

Master §79 mengharuskan setiap component menentukan remain/hide/move/drawer/sticky/grid/size/density behavior, namun §86 menyatakan complete responsive matrix belum final.

Rule responsive yang sudah eksplisit tetap canonical; kekosongan matrix tidak boleh diisi dengan invented owner decisions.

## OD-005 — Final Photography / Media Behavior Matrix

**Status:** ⚠ BELUM FINAL — OWNER DECISION REQUIRED

Master §80 menyatakan master lanjutan wajib mengatur:

- thumbnail;
- zoom PDP;
- crop;
- campaign banner;
- hero;
- video;
- placeholder;
- fallback;
- loading;
- prevention of layout shift.

Product photography yang sudah explicit — 4:5, 2000×2500, WebP, order Depan→Belakang→Detail→Samping/Lifestyle — tetap canonical dan bukan open.

## Open Decision Handling Contract

- Jangan menyembunyikan open decision dalam prose seolah sudah final.
- Jangan membuat random numeric/color/media choice menjadi canonical.
- Gunakan cross-reference dari domain terkait menuju registry ini.
- Jika owner memberi keputusan baru, update Master/versioning terlebih dahulu sebelum mengubah status modular docs.

## Related Documents

- [Color System](../04-typography-color/02-color-system.md)
- [Master Responsive Contract](../09-responsive/02-responsive-contract.md)
- [Product Photography](../11-media/01-product-photography.md)
- [Image Behavior](../11-media/02-image-behavior.md)
- [Iconography](../11-media/03-iconography.md)

## Source Mapping

- Master §18 — CATATAN MASTER WARNA
- Master §79 — MASTER RESPONSIVE CONTRACT
- Master §80 — MASTER PHOTOGRAPHY & MEDIA
- Master §81 — MASTER IKONOGRAFI
- Master §86 — STATUS MASTER
