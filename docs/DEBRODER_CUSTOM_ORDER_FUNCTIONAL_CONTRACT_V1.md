# DEBRODER Custom Order Functional Contract v1.0

Status: **FROZEN UNTUK IMPLEMENTASI**
Scope: **CUSTOM ORDER END-TO-END REVISION**
Baseline: owner-supplied `Debroder(8).zip`

## Authority and boundaries

- Product identity, variant, SKU, stock, and canonical base price remain owned by PIM.
- CMS Custom controls category presentation, visibility, ordering, product mapping, and compatible service presentation only.
- Transaction modules own cart, checkout, order snapshot, quotation, payment, production, QC, fulfillment, notification, and tracking.
- Jersey Custom always routes to `/jersey/configurator`; Jersey source and business flow are outside this revision.
- Ready Stock keeps the existing checkout and fulfillment contract.
- No remote database, GitHub, Vercel, deployment, order deletion, payment deletion, or migration-history rewrite is authorized.

## Canonical customer flow

`/custom` → category → PIM product → variant/quantity → method → print size → placement → personalization/file/note → server repricing → customer review → read-only cart → structured fulfillment data → checkout → order snapshot.

The browser may submit identifiers and choices, but the server must reload PIM/CMS transaction inputs, validate compatibility, calculate pricing, and write the historical snapshot. A category, service, preset, campaign, shortcut, or Jersey entry is never a product line.

## Canonical pricing rule

The product subtotal is based on the active PIM product/variant/size tier. A production method is a selector unless its configured rule is the sole pricing dimension. When an active print-size dimension carries the production price, the same method fee must not also be charged. Placement is charged only when its own active adjustment is non-zero. Every payable line records a component type, source rule, calculation basis, unit amount, quantity, subtotal, and display label.

Client totals are advisory only. `/api/custom/reprice` and checkout recalculate the project. Invalid, stale, missing, zero-price product, incompatible, or semantically duplicated pricing inputs fail closed.

## Historical snapshot

The order snapshot retains product and variant identity, quantity matrix, method, print size, placement, personalization, upload/version metadata, canonical pricing lines, pricing status, project version, and timestamps. Later PIM/CMS changes do not rewrite historical orders.

## Admin operational contract

One order presents one server-derived active stage and one primary action. The lifecycle is:

1. Order Masuk
2. Review Pesanan
3. Penetapan Harga
4. Persetujuan Pelanggan
5. Pembayaran
6. Job Order
7. Produksi
8. Quality Control
9. Packing
10. Pengecekan Akhir
11. Pengiriman/Pickup
12. Selesai

The stage selector is presentation state only. Canonical order, quotation, payment, Job Order, Work Item, QC, fulfillment, and history rows remain the workflow source of truth. Completed stages may be viewed read-only; future stages stay locked. Existing permission and correction modules remain authoritative.

## Payment contract

Payment updates the existing order. Automatic payment availability requires verified customer identity under the existing rule, approved/final pricing, positive amount due, active order, and no paid state or duplicate active link. Payment verification uses the existing atomic RPC and payment/order audit domains. The Phase 7 PIM audit compatibility overload is a bridge for the frozen trigger signature, not a second audit system.

## Address contract

Custom shipping uses canonical region codes and names for province, regency/city, district, and village, plus postal code and detailed delivery fields. The server validates the hierarchy against the local region catalog and snapshots canonical names on the order. Existing Ready Stock legacy address behavior remains compatible. The repository does not include an official region dataset; owner-controlled region data must be loaded before Custom shipping is operationally verified.

## Design and final-verification contract

Customer design metadata is version-aware and distinguishes initial upload, revised upload, approved design, and final production file without deleting older versions. Production continues to use the existing approved-design snapshot controls.

For Custom fulfillment, packing cannot advance to ready-for-shipping/pickup until a server-persisted final-verification checklist is completed. Ready Stock fulfillment remains unchanged.

## Synchronization and concurrency

Server snapshots are recovery truth. Customer tracking refreshes with the same authorized token/WhatsApp credentials using restrained polling plus focus/online recovery. Realtime delivery does not grant broader order access. Payment and final-verification mutations use row locking/version checks so a stale second admin cannot overwrite the first result.

## Retest records and exclusions

- Preserve order `ORD-DEB-2026-0013`.
- Preserve payment `PAY-DEB-2026-0011`.
- Product-specific Custom catalog setup, shipping-label PDF, barcode, broad Admin onboarding, Jersey changes, and Phase 7 changes remain out of scope.
