# DEBRODER B4-A3 — READY STOCK CHECKOUT INTEGRITY

## Root causes proven

1. Ready Stock shipping used a structured UI but sent only `formattedStructuredAddress`.
2. `order_address_snapshots` was populated only by the Custom checkout overload.
3. `canonicalCheckoutPayload()` omitted `addressSnapshot`.
4. The browser reset `createdAt` on each retry and had no payload-aware safe key rotation.
5. The browser discarded operational error codes and `Retry-After`.
6. Mixed Ready Stock + Custom could reach the API before the database rejected it.

## Implemented in this package

- Structured snapshot required for every shipping checkout.
- Ready Stock forward-only RPC overload inserts into existing `order_address_snapshots`.
- Address snapshot included in canonical idempotency payload.
- Payload-aware recovery: unknown failures keep the same key; changed payload rotates only after recovery proves no order exists.
- Stable recovery timestamp.
- Operational error code, reference, and Retry-After handling.
- Mixed Ready Stock + Custom blocked in client, parser, route, and retained database guard.
- No new address table.
- No delete, hard delete, truncate, product mutation, or production data mutation.

## Database status

The migration file is prepared but has NOT been executed.
It must be applied before deploying the source that sends `p_shipping_address_snapshot`
to the Ready Stock RPC.

## Required gates

pnpm typecheck
pnpm lint
pnpm test
pnpm build

Then Vercel Preview and smoke tests:
- Ready Stock shipping creates exactly one order.
- `order_address_snapshots` contains version 1 for that order.
- lost-response retry recovers the same order.
- changed address after a failed attempt gets a new key only after recovery returns no order.
- 429 displays and honors Retry-After.
- mixed Ready Stock + Custom is blocked before order creation.
