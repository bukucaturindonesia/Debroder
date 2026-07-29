# DEBRODER UX/UI Bab 3–9 Requirement Matrix

Status values: `IMPLEMENTED`, `VERIFIED`, `BLOCKED_WITH_EVIDENCE`,
`NOT_APPLICABLE_WITH_REASON`.

| Requirement ID | Route/System | Status | Evidence |
|---|---|---|---|
| BAB3-FLOW-001 | Ready Stock listing → PDP → cart → checkout | VERIFIED | Server pricing/stock contracts and regression PASS; PDP, cart, checkout runtime rendered |
| BAB3-FLOW-002 | `/jersey/shop` Pilih Desain | VERIFIED | Route, selector isolation, and Jersey commerce tests PASS |
| BAB3-FLOW-003 | `/jersey/configurator` Jersey Custom | BLOCKED_WITH_EVIDENCE | Server exact pricing implemented, but `CheckoutClient` still blocks configured items and no canonical checkout RPC exists |
| BAB3-FLOW-004 | `/custom/[category-slug]` | VERIFIED | Pair integrity, immutable server repricing, and Custom suite 27/27 PASS |
| BAB3-FLOW-005 | `/track-order` | VERIFIED | Safe token/manual tracking tests PASS and route rendered |
| BAB4-IA-001 | Canonical public routes | VERIFIED | Central registry, sitemap/header consumption, and safe aliases implemented; focused tests PASS |
| BAB4-IA-002 | Taxonomy/PIM | BLOCKED_WITH_EVIDENCE | Duplicate category/subcategory/product slugs 0 and orphan subcategories 0; active `jersey-custom-pilot` has no subcategory |
| BAB4-IA-003 | Breadcrumb/search | VERIFIED | Universal PDP and public product/service search contract PASS |
| BAB5-HOME-001 | `/` | VERIFIED | Frozen section order and CMS/PIM ownership test PASS |
| BAB6-LAYOUT-001 | Public route states | VERIFIED | Loading/empty/error/success contracts and focused tests PASS |
| BAB6-RESP-001 | 360–1536 | VERIFIED | All eight canonical viewports rendered with no horizontal overflow |
| BAB7-DS-001 | Global design system | VERIFIED | Inter, V1.1 tokens, focus traps, motion/z-index primitives, and focused tests PASS |
| BAB8-HIFI-001 | Listing/PDP/media data | BLOCKED_WITH_EVIDENCE | High-fidelity cards/PDP implemented; nine canonical product/Jersey primary images remain unproven |
| BAB8-HIFI-002 | Checkout/Custom/Jersey/tracking UI | IMPLEMENTED | Human copy, stable product cards, checkout media chain, and focused tests PASS |
| BAB9-RUNTIME-001 | Navigation/commerce/accessibility | BLOCKED_WITH_EVIDENCE | Main routes and viewport matrix rendered; `/koleksi` navigation aborted during dev compilation and keyboard automation timed out |
| BAB9-RUNTIME-002 | Performance/errors/SEO/analytics | BLOCKED_WITH_EVIDENCE | Metadata rendered and build PASS; isolated browser blocked Supabase media, Preview performance is unmeasured, and no existing analytics architecture exists |
| CROSS-DATA-001 | Canonical trial data | BLOCKED_WITH_EVIDENCE | 12 products/3 services reconciled; nine images and 89 ambiguous source assets require owner/PIM identity |

