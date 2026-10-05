# Owner-directed V1 apparel and WhatsApp journey — 2026-09-28

Authority: the owner's attached “Sederhanakan DEBRODER agar siap go-live di debroder.id” brief explicitly requests a visual apparel hero, a small product catalogue, simple custom services, and WhatsApp as the main V1 inquiry/order-contact channel. This supersedes the earlier zero-product/email-only release presentation and the frozen public commerce journey **only for this bounded V1 brochure release**. It does not rewrite transaction authority, PIM, Admin, database, or W3 acceptance. Production deployment is expressly excluded.

## Audit before implementation

- Existing homepage: text-only hero, service rows, three process steps, empty product teaser, company copy, and email contact band.
- Reused: canonical black/white symbol+wordmark `Logo`, Geist font, brochure color tokens, header/footer, native mobile menu, button styles, Next Image optimization, and existing product detail URL.
- Simplification: hero → two products → three services → custom CTA. Menu: Produk, Custom Jersey, DTF / Sablon, Layanan, Tentang; WhatsApp “Pesan Custom” on the right. Service menu entries target `/layanan#custom-jersey` and `/layanan#dtf-sablon`. Search is omitted because its commerce route is gated.
- Public checkout, account, payment, tracking and legacy commerce pages already return 404 in this release. Keep that restriction and all underlying implementations. Only the two named inquiry details are newly allowlisted; unknown or staging product slugs remain blocked.
- Existing WhatsApp source: `lib/contact.ts` → `contactLinks.apparelWhatsapp`, consistent with `lib/url.ts`: `https://wa.me/6285355333364`. The new brief instructs use of that configured number. `src/config/site.ts` reuses it and owns the encoded inquiry template; email remains `hello@debroder.id`.
- Catalogue was empty. The owner explicitly names NSA Premium and Cotton Combed 24s, now represented only as editorial inquiry entries. No price, stock, SKU or unverified specification is manufactured. No other local example or staging fixture is promoted. Historical W3 fixture product remains outside the public allowlist; remote data was not queried or deleted.
- A CITITEX screenshot is mentioned but was not present in the received attachment directory (text brief only). No CITITEX assets, copy, or identity were retrieved or used.

## Content ownership and asset replacement

`src/data/products.ts` holds the two presentation records, image/alt/caption, and optional verified `priceFrom`. It is a small, typed replacement point for future Admin integration; editing it is currently a source change, **not a newly implemented Admin editing workflow**. Existing PIM product management remains unchanged. The inquiry entries do not create PIM products, variants, sellables, stock, or orders. Fields entered by a customer describe requested needs and do not assert an available size/color selection.

Images reuse existing repository files, with visible “Visual referensi” captions. They are not represented as verified NSA/Cotton Combed photography or client portfolio. The current shirt sources are only 421×551 px; jersey sources are 828×1472 px. They are temporary visual references, not release-ready master photography. Replace with owner-approved imagery before public launch: hero desktop 1920×900, separately composed mobile 1080×1350, products 2000×2500 (4:5). The current desktop hero frame is 1920:900, mobile image frame 4:5; Next Image supplies responsive WebP delivery. Only hero/detail main images have priority; below-fold images remain lazy-loaded. No AI or external image was created/downloaded and no dependency was added.

`src/data/services.ts` holds Custom Jersey, DTF / Sablon, and the already-existing Maklon Sublim service. Do not claim unsupported capabilities, delivery times, prices, customer counts, reviews, or stock.

## Route and contact behavior

Public pages: `/`, `/produk`, `/layanan`, `/tentang`, `/kontak`, `/produk/nsa-premium`, `/produk/cotton-combed-24s`. Sitemap derives those same seven pages. Metadata and product links use the canonical `/produk/[slug]`. Preview remains noindex. Arbitrary PIM product detail fallback remains disabled; no production PIM query is needed to render this release.

Product detail → optional requested size/color, positive whole-number quantity, notes → WhatsApp with an encoded draft. The customer reviews and sends the message in WhatsApp; opening the link creates no order/payment/reservation in DEBRODER. Invalid quantities prevent the contact action. Custom-service links use the same template with the correct service name. Email is the alternative.

Release prerequisites remaining: approve/replace the reference photography, review the current local preview, and obtain a separate deployment instruction when ready. The task does not authorize commit/push, production deployment, DNS changes, database changes, or Wave 4.
