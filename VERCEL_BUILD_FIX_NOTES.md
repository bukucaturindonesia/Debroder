# DEBRODER Vercel Build Fix — 20 July 2026

Fixed two prebuild test failures from Vercel commit `32f8e59`:

1. `admin-order-pricing-workspace.test.ts`
   - Restored the canonical JSX guard shape `{canOpenJobOrder ? (` and `{canOpenFulfillment ? (` without changing the prerequisite logic.

2. `human-centered-order-experience-p0.test.ts`
   - Standardized the exact human-facing phrase: `Nomor Pengiriman DEBRODER bukan nomor resi kurir`.

No database migration, business-state transition, permission, or lifecycle rule was changed.
