# DEBRODER — DEEP MODULAR UI SYSTEM v1.0

## Status

**CANONICAL MODULAR SPECIFICATION**

**Canonical source:** `DEBRODER_MASTER_UI_SYSTEM_v1.0.md`

## Purpose

Dokumentasi ini memecah Master UI DEBRODER menjadi domain specifications yang dapat dibuka secara selektif oleh developer, designer, reviewer, atau AI/Codex tanpa menjadikan satu giant Markdown sebagai working context.

Master tetap menjadi authority. Modular docs memperluas detail menjadi implementation contract tanpa mengubah canonical meaning.

## Authority Model

```text
DEBRODER_MASTER_UI_SYSTEM_v1.0.md
↓
OWNER LOCKED decisions
↓
CANONICAL rules
↓
BELUM FINAL / Open Decisions
↓
Modular Specifications
↓
Existing Implementation
↓
Existing Tests
```

Jika existing implementation bertentangan dengan Master, **Master tetap menjadi target** dan perbedaannya dicatat sebagai implementation gap pada package audit implementasi.

## Document Architecture

### Governance

- [UI System Charter](00-governance/00-ui-system-charter.md)
- [OWNER LOCKED Decisions Registry](00-governance/01-owner-locked-decisions.md)
- [Canonical Rules Governance](00-governance/02-canonical-rules.md)
- [Open Decisions Registry](00-governance/03-open-decisions.md)
- [Master Coverage Matrix §1–§88](00-governance/04-master-coverage-matrix.md)
- [Implementation Gap Registry](00-governance/05-implementation-gaps.md)

### Foundations

- [Visual Direction](01-foundations/01-visual-direction.md)
- [Layer Architecture](01-foundations/02-layer-architecture.md)
- [Density & Surface System](01-foundations/03-density-surface.md)
- [Information Hierarchy](01-foundations/04-information-hierarchy.md)

### Tokens

- [Spacing Tokens](02-tokens/01-spacing.md)
- [Component Dimensions](02-tokens/02-dimensions.md)
- [Radius, Border & Shadow](02-tokens/03-radius-border-shadow.md)
- [Z-Index Contract](02-tokens/04-z-index.md)
- [Master Token Contract](02-tokens/05-master-token-contract.md)

### Layout

- [Container & Content Width](03-layout/01-container-width.md)
- [Grid System](03-layout/02-grid-system.md)
- [Section Spacing & Rhythm](03-layout/03-section-spacing.md)
- [Global Alignment & Section Header](03-layout/04-alignment.md)
- [Standard Page Template](03-layout/05-page-templates.md)

### Typography & Color

- [Typography System](04-typography-color/01-typography.md)
- [DEBRODER Color System](04-typography-color/02-color-system.md)
- [Semantic Color Contract](04-typography-color/03-semantic-color.md)
- [Price Typography](04-typography-color/04-price-typography.md)

### Components

- [Navigation System](05-components/01-navigation.md)
- [Button System](05-components/02-buttons.md)
- [Form System](05-components/03-forms.md)
- [Card Family & Dimensions](05-components/04-cards.md)
- [Product Card — Canonical Deep Specification](05-components/05-product-card.md)
- [Variant Selectors](05-components/06-selectors.md)
- [Badges & Icons](05-components/07-badges-icons.md)
- [Modal, Drawer & Popover Contract](05-components/08-modal-drawer-popover.md)
- [Interactive Component State Contract](05-components/09-component-state-contract.md)

### Public Commerce

- [Homepage](06-public-commerce/01-homepage.md)
- [Hero & Editorial System](06-public-commerce/02-hero-editorial.md)
- [Category System](06-public-commerce/03-category-system.md)
- [PLP / Katalog](06-public-commerce/04-plp-catalog.md)
- [Product Detail Page — OWNER LOCKED](06-public-commerce/05-pdp.md)
- [Cart](06-public-commerce/06-cart.md)
- [Checkout / Pembayaran](06-public-commerce/07-checkout.md)

### Customer

- [Customer Shell](07-customer/01-customer-shell.md)
- [Account Layout](07-customer/02-account-layout.md)
- [Orders & Transactions](07-customer/03-orders-transactions.md)
- [Customer Responsive Contract](07-customer/04-customer-responsive.md)

### Admin

- [Admin Shell](08-admin/01-admin-shell.md)
- [Admin Navigation](08-admin/02-admin-navigation.md)
- [Admin Cards](08-admin/03-admin-cards.md)
- [Admin Tables](08-admin/04-admin-tables.md)
- [Admin Density & Typography](08-admin/05-admin-density.md)
- [Admin Responsive Contract](08-admin/06-admin-responsive.md)

### Responsive

- [Responsive Breakpoints](09-responsive/01-breakpoints.md)
- [Master Responsive Contract](09-responsive/02-responsive-contract.md)
- [Mobile Commerce Priority](09-responsive/03-mobile-commerce.md)
- [Sticky Behavior](09-responsive/04-sticky-behavior.md)

### System States

- [Loading & Skeleton](10-system-states/01-loading-skeleton.md)
- [Empty States](10-system-states/02-empty-states.md)
- [Error, Warning & Success](10-system-states/03-error-warning-success.md)
- [Motion](10-system-states/04-motion.md)
- [Accessibility Contract](10-system-states/05-accessibility.md)

### Media

- [Product Photography](11-media/01-product-photography.md)
- [Image Behavior](11-media/02-image-behavior.md)
- [Iconography](11-media/03-iconography.md)

### Content

- [Language System — OWNER LOCKED](12-content/01-language-system.md)
- [UI Copy](12-content/02-ui-copy.md)
- [Unfinished & Caution — OWNER LOCKED](12-content/03-unfinished-caution.md)

### Quality

- [UI QA Checklist](13-quality/01-ui-qa-checklist.md)
- [Owner Quality Gate](13-quality/02-owner-quality-gate.md)
- [Definition of Done](13-quality/03-definition-of-done.md)
- [Canonical Implementation Sequence](13-quality/04-implementation-sequence.md)


## Reading Order

1. Baca [UI System Charter](00-governance/00-ui-system-charter.md).
2. Periksa [OWNER LOCKED Decisions](00-governance/01-owner-locked-decisions.md).
3. Periksa [Open Decisions](00-governance/03-open-decisions.md).
4. Buka domain pekerjaan yang relevan.
5. Ikuti Related Documents dan Source Mapping dari domain tersebut.
6. Selesaikan review menggunakan [UI QA Checklist](13-quality/01-ui-qa-checklist.md) dan [Owner Quality Gate](13-quality/02-owner-quality-gate.md).

## Domain Map

### Working on Homepage

Read:

- `01-foundations/*`
- `02-tokens/*`
- `03-layout/*`
- `04-typography-color/*`
- `05-components/01-navigation.md`
- `05-components/04-cards.md`
- `05-components/05-product-card.md`
- `06-public-commerce/01-homepage.md`
- `06-public-commerce/02-hero-editorial.md`
- `09-responsive/*`
- `10-system-states/*`
- `11-media/*`
- `12-content/*`

### Working on PLP / Katalog

Read:

- `02-tokens/*`
- `03-layout/*`
- `04-typography-color/*`
- `05-components/*`
- `06-public-commerce/04-plp-catalog.md`
- `09-responsive/*`
- `10-system-states/*`
- `11-media/*`
- `12-content/*`

### Working on PDP

Read:

- `02-tokens/*`
- `03-layout/*`
- `04-typography-color/*`
- `05-components/*`
- `06-public-commerce/05-pdp.md`
- `09-responsive/*`
- `10-system-states/*`
- `11-media/*`
- `12-content/*`

### Working on Cart / Checkout

Read:

- `05-components/02-buttons.md`
- `05-components/03-forms.md`
- `06-public-commerce/06-cart.md`
- `06-public-commerce/07-checkout.md`
- `09-responsive/*`
- `10-system-states/*`
- `12-content/*`

### Working on Customer Area

Read:

- `07-customer/*`
- `09-responsive/*`
- `10-system-states/*`
- `12-content/*`

### Working on Admin

Read:

- `08-admin/*`
- `09-responsive/*`
- `10-system-states/*`
- `12-content/*`
- `13-quality/*`

## OWNER LOCKED Summary Index

Primary registry: [OWNER LOCKED Decisions Registry](00-governance/01-owner-locked-decisions.md).

High-impact examples include:

- Bahasa Indonesia penuh.
- Geist Sans.
- Hijau sebagai identitas/signature DEBRODER.
- Merah untuk caution/unfinished/error/attention.
- Product media ratio 4:5.
- PDP CTA hierarchy/order/layout.
- Customer/Admin shell directions.
- QA direction.

Registry harus dibaca untuk daftar yang berasal dari Master; contoh di atas bukan pengganti registry.

## Open Decision Index

Primary registry: [Open Decisions Registry](00-governance/03-open-decisions.md).

Minimal unresolved owner decisions dari Master:

- HEX Hijau DEBRODER resmi.
- Full Green 50–950 scale.
- Final icon family.
- Complete responsive matrix per component.
- Final photography/media behavior matrix.

## Implementation Navigation

Gunakan [Master Coverage Matrix](00-governance/04-master-coverage-matrix.md) jika perlu melacak:

```text
Master §n → modular destination
```

Gunakan `## Source Mapping` di setiap domain file untuk reverse traceability:

```text
Modular domain → Master §n
```

Canonical value tidak boleh dibuat berbeda hanya karena ditulis dalam context domain yang berbeda.

## Completion

Pekerjaan UI belum selesai hanya karena happy path tampak bagus.

Final review harus mencakup:

- layout;
- typography;
- color;
- cards;
- controls;
- commerce hierarchy;
- responsive;
- state;
- accessibility;
- Bahasa Indonesia;
- unfinished/caution;
- Owner Quality Gate.

See [Definition of Done](13-quality/03-definition-of-done.md).

## Source Mapping

- Master §1 — PRINSIP UTAMA
- Master §2 — ARAH VISUAL DEBRODER
- Master §86 — STATUS MASTER
- Master §88 — FINAL PRINCIPLE
