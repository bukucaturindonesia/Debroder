# DEBRODER — Master Panduan Ukuran v1.0

A targeted, UI-only implementation package for the existing `/produk/[slug]` purchase panel.

## Sources and measurements

- Short sleeve: S–3XL; chest, length, and sleeve figures from the owner's short-sleeve screenshot.
- Long sleeve: S–5XL; chest, length, and sleeve figures from the owner's long-sleeve screenshot.
- Tolerance: **1–2,5 cm** as written in both original screenshots.
- Diagrams cropped from the two owner's screenshots and converted to small lossless WebP images. Table values are real text (accessible/zoomable), not embedded in an image.

## Apply to your Windows project

1. Extract this package anywhere outside the repository.
2. **Paling mudah di Windows:** klik dua kali `PASANG_PANDUAN_UKURAN_WINDOWS.cmd`, tempel path folder repository DEBRODER, dan setujui penerapan setelah preflight. Node.js harus sudah terpasang.

   **Atau**, buka PowerShell dan jalankan:

```powershell
python .\tools\install_master_ukuran.py "C:\path\to\Debroder"
python .\tools\install_master_ukuran.py "C:\path\to\Debroder" --apply
```

The first command is a safe dry run. The installer verifies anchors and refuses to overwrite any different preexisting file. It alters `components/TieredProductPurchasePanel.tsx` only at the existing size selector, adds three source/test files and two WebP assets, and appends a factual local checkpoint to `CURRENT_PHASE_HANDOFF.md`. It does NOT edit the production environment or database.

3. In the repository, validate:

```powershell
pnpm test test/master-kaos-size-guide.test.ts
pnpm typecheck
pnpm exec eslint components/product/MasterKaosSizeGuide.tsx components/TieredProductPurchasePanel.tsx lib/master-kaos-size-guide.ts test/master-kaos-size-guide.test.ts
pnpm build
```

4. Verify `/produk/<kaos-slug>` on mobile and desktop: open/close modal, ESC, tab focus trap, both sleeve tabs, 6/8 rows, readable at narrow width, no cart changes, and no influence on PIM-specific product guide.

## Scope / exclusions

- No checkout, orders, admin, Supabase, product variants, PIM, global styling or Sablon DTF changes.
- Product page shows button only for matching kaos/T-shirt/cotton combed categories; not for Jersey, jackets, hoodies or unrelated products.
- PIM-specific size guides remain unchanged in the existing "Informasi Produk" disclosure. The master is a general reference, not automatic SKU-size availability.
- Implemented in a downloadable patch package because the connected GitHub integration denied branch creation with HTTP 403. The live website has **not** been updated by this package.
