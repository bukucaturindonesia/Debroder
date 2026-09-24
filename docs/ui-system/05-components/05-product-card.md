# Product Card — Canonical Deep Specification

## Status

**CANONICAL / OWNER LOCKED CONTENT PRESERVED**

**Authority:** `DEBRODER_MASTER_UI_SYSTEM_v1.0.md`

Dokumen ini adalah modular implementation specification. Canonical rule yang dikutip dari Master memiliki authority lebih tinggi daripada implementation guidance di dokumen ini.

## Purpose

Menjadi canonical home untuk ProductCard DEBRODER: ratio, anatomy, alignment, media, typography, price, grid behavior, states, dan accessibility.

## Scope

PLP, featured products, best sellers, category product collections, dan quick commerce surfaces yang memakai ProductCard.

## Canonical Rules

### Master §23 — PRODUCT CARD — CANONICAL

## Image Ratio

LOCKED:

```text
4:5
```

Canonical source:

```text
2000 × 2500px
```

## Desktop

```text
4 cards / row
gap: 20–24px
```

## Tablet

```text
3 cards / row
gap: 20px
```

## Mobile

```text
2 cards / row
gap: 12px
```

Gunakan fluid grid.

Contoh:

```css
grid-template-columns: repeat(4, minmax(0, 1fr));
```

Jangan hard-code width card.

### Master §24 — PRODUCT CARD STRUCTURE

```text
ProductCard
│
├── Image Container 4:5
│   ├── Product Image
│   ├── Badge
│   ├── Favorit
│   └── Quick Action opsional
│
└── Product Information
    ├── Nama Produk
    ├── Varian / Descriptor
    ├── Harga
    └── Harga Sebelumnya opsional
```

Spacing:

```text
Image → Nama Produk: 12–16px
Nama → Metadata: 4px
Metadata → Harga: 6–8px
```

Nama produk:

```text
14–16px
500
maksimum 2 baris
```

Metadata:

```text
12–13px
```

Harga:

```text
14–16px
600
```

### Master §25 — PRODUCT CARD ALIGNMENT

Dalam satu grid:

- top image sejajar;
- bottom image sejajar;
- nama produk memiliki line clamp;
- harga memiliki posisi konsisten;
- metadata tidak menggeser card lain.

Total height tidak dikunci secara kaku.

Yang dikunci:

- image ratio;
- text spacing;
- maximum text lines.

### Master §26 — PRODUCT IMAGE RULE

```text
width: 100%
height: 100%
object-fit: cover
```

Dilarang:

- stretch;
- crop random;
- campur portrait/square dalam section yang sama;
- background produk yang tidak konsisten.

## Detailed Specification

### Domain intent

- Image ratio 4:5 dan source 2000×2500 adalah locked.
- Desktop 4/row, tablet 3/row, mobile 2/row.
- Image/name/metadata/price spacing dipertahankan.
- Nama maksimum 2 baris dan harga punya posisi konsisten.
- Card width harus fluid melalui grid, bukan hard-coded.
- Image uses width/height 100% dan object-fit cover.

### Interpretation contract

- Setiap nilai angka, range, urutan, ratio, terminology, hierarchy, atau status yang berasal dari Master dipertahankan apa adanya.
- Penjelasan tambahan di dokumen ini adalah **IMPLEMENTATION GUIDANCE** kecuali dinyatakan sebagai CANONICAL/OWNER LOCKED dari Source Mapping.
- Existing implementation tidak boleh digunakan untuk menurunkan canonical target.
- Jika kebutuhan implementasi memerlukan detail yang belum ada di Master, detail tersebut tidak boleh disamarkan sebagai final decision.
- Cross-domain value harus dirujuk ke canonical owner-nya agar tidak membentuk source-of-truth ganda.

## Dimensions

- Image container menjadi anchor geometry; information block mengikuti spacing canonical.

- Nilai dimension yang tersedia pada Canonical Rules di atas bersifat authoritative untuk domain ini.
- Jika tidak ada numeric dimension pada source, dokumen ini tidak membuat numeric value baru.
- Fixed, minimum, maximum, range, dan fluid behavior tidak boleh saling dipertukarkan tanpa source.

## Layout Contract

- Image container menjadi anchor geometry; information block mengikuti spacing canonical.
- Grid menjaga top/bottom image alignment dan stable price position.

## Typography Contract

- Nama max 2 baris; metadata secondary; price weight sesuai Master.
- Truncation tidak boleh menyembunyikan harga.

## Color / Surface Contract

- Product photography tetap dominan; brand accent tidak mengalahkan gambar.
- Badge semantic mengikuti status.

## Interaction Contract

- Favorit/quick action opsional tidak boleh mengalahkan product navigation/purchase intent.
- Hover image scale mengikuti motion limit global jika digunakan.

## Responsive Contract

- 4/3/2 columns mengikuti product grid contract.
- Card width fluid; image ratio tetap 4:5.

## State Contract

- Skeleton mengikuti 4:5 + text + price geometry.
- Missing media behavior yang belum final direferensikan ke open decisions.

## Accessibility Contract

- Product link/action names jelas; icon-only favorite punya label; status tidak hanya warna.

## Anatomy Contract

Canonical anatomy harus dibaca sebagai hierarchy tetap, bukan sekadar daftar field:

```text
ProductCard
│
├── Image Container 4:5
│   ├── Product Image
│   ├── Badge
│   ├── Favorit
│   └── Quick Action opsional
│
└── Product Information
    ├── Nama Produk
    ├── Varian / Descriptor
    ├── Harga
    └── Harga Sebelumnya opsional
```

### Image container

Image container adalah anchor geometry ProductCard. Ratio `4:5` tidak boleh berubah karena nama produk panjang, badge muncul, atau quick action aktif. Image container juga tidak boleh berubah ratio antar ProductCard pada grid yang sama.

`Product Image` mengisi container menggunakan canonical rule `width: 100%`, `height: 100%`, `object-fit: cover`.

Dilarang menggunakan image sizing yang menyebabkan:

- stretch;
- portrait image menjadi square;
- card tertentu memiliki visual height berbeda;
- crop yang berbeda secara acak antar card;
- product information terdorong karena image load selesai.

### Badge

Badge adalah supporting status dan tidak boleh mengambil hierarchy dari product image/name/price. Jika badge `Belum Selesai` digunakan pada internal implementation/review, semantic merah mengikuti caution contract.

### Favorit

Favorit adalah action tambahan. Karena statusnya bukan primary commerce action, visual weight-nya tidak boleh mengalahkan product link atau harga. Jika menggunakan icon-only action, hit target dan accessible label mengikuti icon/accessibility contract.

### Quick Action

Quick Action bersifat opsional. Keberadaan quick action tidak memberi izin mengubah anatomy canonical atau membuat seluruh card menjadi panel penuh control. Jika implementation belum memiliki quick action, ProductCard tetap valid tanpa elemen tersebut.

## Content Contract

### Nama Produk

Nama produk menggunakan `14–16px`, weight `500`, maksimum dua baris. Line clamp menjaga konsistensi vertical rhythm dalam satu grid. Nama tidak boleh dipaksa satu baris dengan font lebih kecil daripada range canonical.

### Metadata / Descriptor

Metadata menggunakan `12–13px`. Metadata adalah supporting information; jangan membuat contrast atau weight yang menyamai nama dan harga.

### Harga

Harga menggunakan `14–16px`, weight `600`. Price position harus mudah dipindai dalam grid dan tidak bergerak secara random hanya karena product name satu atau dua baris.

### Previous Price

Harga sebelumnya bersifat opsional pada anatomy. Master tidak menentukan detail style tambahan; jangan mengarang numeric typography atau decoration rule baru sebagai canonical.

## Alignment Contract — Grid Level

Dalam satu row product grid:

- top image sejajar;
- bottom image sejajar;
- image ratio identik;
- text block dimulai setelah spacing canonical dari image;
- nama dibatasi maksimal dua baris;
- metadata tidak boleh menggeser harga secara tidak terkendali;
- card total height tidak dikunci secara kaku.

Tujuan alignment adalah scanability. Developer tidak boleh menyelesaikan misalignment dengan fixed total card height yang memotong content bila Master tidak memerintahkannya.

## Responsive ProductCard Matrix

| Viewport contract | Columns | Gap | ProductCard behavior |
|---|---:|---:|---|
| `≥1280` | 4 | `20–24px` | Fluid width di dalam grid |
| `768–1279` | 3 | `20px` | Ratio image tetap `4:5` |
| `<768` | 2 | `12px` | Dua kolom tetap; jangan berubah menjadi satu kolom tanpa owner decision |

ProductCard tidak memiliki fixed width canonical. Width berasal dari grid column.

## State Matrix

| State | Required behavior |
|---|---|
| Default | Image, name, metadata, dan price mudah dipindai |
| Hover | Tidak mengubah geometry; image hover jika digunakan mengikuti global motion limit |
| Focus | Link/action focus terlihat jelas |
| Aktif | Action yang sedang digunakan tetap dapat dibedakan |
| Terpilih | Hanya relevan bila konteks benar-benar menggunakan selectable ProductCard |
| Disabled | Jangan digunakan sebagai shortcut untuk stock state tanpa semantic contract |
| Loading | Gunakan skeleton `4:5 image + text bar + text bar + price bar` |
| Error | Error/fallback media tidak boleh memecahkan ratio |
| Success | Feedback action seperti quick-add harus dekat tindakan dan tidak merombak card |

## ProductCard Edge-Case Decisions

### Nama sangat panjang

Gunakan maximum two-line contract. Jangan mengecilkan font di bawah range canonical.

### Metadata kosong

Jangan menambahkan placeholder dekoratif hanya untuk menjaga tinggi card. Layout harus tetap konsisten berdasarkan anatomy dan spacing.

### Harga sebelumnya tidak ada

Harga current tetap berada pada price hierarchy. Jangan membuat empty line yang terlihat seperti bug.

### Image belum tersedia

Master belum memfinalkan fallback/placeholder matrix. Pertahankan 4:5 footprint dan tandai detail fallback sebagai open decision.

### Badge + Favorit + Quick Action bersamaan

Pastikan image tetap primary visual. Supporting controls tidak boleh mengubah ProductCard menjadi control-heavy SaaS tile.

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

- Image ratio 4:5 dan source 2000×2500 adalah locked.
- Desktop 4/row, tablet 3/row, mobile 2/row.
- Image/name/metadata/price spacing dipertahankan.
- Nama maksimum 2 baris dan harga punya posisi konsisten.
- Card width harus fluid melalui grid, bukan hard-coded.
- Image uses width/height 100% dan object-fit cover.
- Tidak ada numeric value canonical yang berubah dari Master.
- Tidak ada OWNER LOCKED decision yang direinterpretasikan.
- Tidak ada BELUM FINAL decision yang difinalkan sebagai canonical.
- State dan accessibility requirements dipertimbangkan bila domain memiliki interaksi.
- Source Mapping tersedia dan dapat dilacak ke Master.

## Related Documents

- [PLP / Katalog](../06-public-commerce/04-plp-catalog.md)
- [Product Photography](../11-media/01-product-photography.md)
- [Master Responsive Contract](../09-responsive/02-responsive-contract.md)

## Source Mapping

- Master §23 — PRODUCT CARD — CANONICAL
- Master §24 — PRODUCT CARD STRUCTURE
- Master §25 — PRODUCT CARD ALIGNMENT
- Master §26 — PRODUCT IMAGE RULE
- Master §58 — RESPONSIVE PRODUCT GRID
- Master §63 — LOADING
- Master §68 — ACCESSIBILITY
- Master §75 — PRICE TYPOGRAPHY
