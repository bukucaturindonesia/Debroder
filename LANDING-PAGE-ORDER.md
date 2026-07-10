# DEBRODER Landing Page Blueprint v1.0 — FROZEN

Public homepage order:

1. Smart Header
2. Hero Slider
3. Trust Strip
4. Featured
5. Trending
6. Editorial Campaign Block
7. Fresh Drop
8. Shop by Category
9. Store & Cara Order
10. Tentang DEBRODER
11. Footer

Legacy homepage sections `plain-category` and `instagram-banner` remain in CMS data for backward compatibility, but are not rendered by the frozen v1.0 public homepage.

## Data source

- Hero, Featured, Trending, Editorial Campaign, Shop by Category, About: CMS.
- Fresh Drop: products selected from PIM; active products are used as a safe fallback.
- Store: store records.

## Interaction rules

- Native browser/touchpad scrolling; no global smooth-scroll library.
- No vertical scroll snapping.
- Content carousels do not auto-slide.
- Mobile carousels show approximately 1.3 cards.
- Header utility and promo bars are hidden on first load and while browsing; they appear only after the user has left the top and returns to the absolute top.
