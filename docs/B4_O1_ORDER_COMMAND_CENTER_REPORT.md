# B4-O1 — Order Command Center & End-to-End Status Integrity

Status source package: IMPLEMENTED, PENDING REPOSITORY GATES AND PREVIEW SMOKE TEST.

## Root causes addressed

1. Admin and customer presentation could merge stale `resolve_order_active_stage_v1` payloads over fresher payment and fulfillment facts.
2. The default admin detail rendered every operational module and every journey step in one long page.
3. The public payment page did not receive current fulfillment, courier, and tracking-number facts.
4. Guest tracking exposed a tracking number but did not provide copy and official courier tracking actions.

## Changes

- Default admin order route opens `OrderCommandCenterAdmin`.
- Legacy complete detail remains available through `?view=full`.
- Command Center resolves status from current order, latest payment, job order, QC, and fulfillment facts.
- Customer presentation uses the same TypeScript resolver and treats old RPC presentation data as compatibility-only.
- Six compact stages are shown; full history is moved behind a disclosure.
- Only one tab is rendered at a time: Ringkasan, Pembayaran, Barang / Produksi, Pengiriman / Pickup, or Riwayat.
- Public payment and guest tracking pages expose current courier and tracking information.
- Copy-resi and official carrier tracking actions are added.
- `shipped` and `in_transit` remain non-terminal. Completion requires `delivered` or `picked_up`.

## Safety

- Database mutation: NONE.
- Migration: NONE.
- Delete/hard delete: NONE.
- GitHub commit/push/merge: NONE.
- Deployment: NONE.

## Required gates after extraction

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

## Required Preview smoke test

1. Use the same branch, commit, Preview domain, and database for admin and customer pages.
2. Submit payment proof. Customer must show `Pembayaran Sedang Diperiksa`; admin must show `Periksa Pembayaran`.
3. Verify payment. Ready Stock must move to preparation.
4. Set fulfillment to `shipped` or `in_transit`. Both admin and customer must show shipping, never `Pesanan Dibuat`.
5. Confirm courier, resi, copy action, and carrier tracking action.
6. Confirm order is not complete until `delivered` or `picked_up`.
7. Confirm only one command-center tab is visible and `?view=full` preserves the complete legacy page.
