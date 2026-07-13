# DEBRODER v1.2 Phase 11 — File Manifest

## Installation

Copy every file in this package to the repository root and choose **Replace** when prompted.

Do not execute the SQL files manually. The Phase 11 migrations listed below are already present in the remote database; they are included to synchronize repository source with migration history.

## New files

- `app/admin/fulfillments/page.tsx`
- `app/admin/fulfillments/[id]/page.tsx`
- `components/admin/FulfillmentAdmin.tsx`
- `components/admin/FulfillmentDetailAdmin.tsx`
- `lib/fulfillments.ts`
- `test/fulfillment-phase11.test.ts`
- `docs/DEBRODER_V1.2_PHASE11_FULFILLMENT.md`
- Phase 11 migrations `20260712154540`–`20260713003444`

## Updated files

- `components/admin/layout/admin-navigation.ts`
- `components/admin/OrderDetailAdmin.tsx`
- `docs/DEBRODER_V1.2_EXECUTION_STATE.md`
- `docs/DEBRODER_V1.2_ISSUE_REGISTER.md`

## Admin routes

- `/admin/fulfillments`
- `/admin/fulfillments/[id]`

## Commit message

`feat(v1.2): complete Phase 11 shipping and pickup`

## Deployment gate

- Push to GitHub.
- Wait for Vercel deployment to succeed.
- Open **Operasional → Pengiriman & Pickup**.
- Confirm list, detail, Gudang Arsip, and mobile layout load without 404.
- Do not begin Phase 12 until Phase 11 deployment is confirmed.
