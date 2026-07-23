# P7A Pricing Parity Report

Date: 2026-07-24  
Branch: `Batch-1-—-Fondasi-dan-Performa-Halaman`  
Baseline HEAD: `9ff4e197d459fe672cbf95258b8fccdc2310060c`

## Status

**P7A PASS WITH TWO EXPLICIT P7B BLOCKERS.**

All executable TypeScript and read-only SQL pricing fixtures have zero
unexplained mismatch. Four source mismatches were resolved. Two database
enforcement gaps are explicitly `BLOCKED`, evidenced below, and remain owned by
P7B. P6 and P7B were not started.

## Authority

- Frozen owner decisions: OD-07 transaction limits, OD-08 quotation semantics,
  OD-10/OD-15 prohibition on fallback/sample data in transaction-critical
  pricing, OD-16 fail-closed checkout, and immutable historical snapshots.
- Canonical database: `products.sales_mode`, `products.pricing_mode`,
  `products.tier_scope`, active non-overlapping `product_price_tiers`,
  sellable `product_variant_sizes.price_adjustment`, and
  `finalize_public_ready_stock_pricing_v1`.
- Ready Stock canonical formula:
  `(tier.unit_price ?? product.base_price) + variant.price_adjustment +
  product_variant_size.price_adjustment`.
- `product_size_master` remains presentation/master data and is not a second
  transaction price adjustment.

## Live database evidence

Read-only queries against project `DEBRODER APPAREL` proved:

- PostgreSQL 17.6;
- one active product, classified `ready_stock / variant_based / product`;
- three active tiers: 1–11 at 45,000; 12–23 at 42,000; 24+ at 40,000;
- zero active-tier overlap due to
  `product_price_tiers_no_overlap_active`;
- zero `tier_scope` anomaly;
- zero active minimum rule or quotation threshold in current live data;
- no schema, data, migration history, function, trigger, RLS, or snapshot was
  changed.

The read-only SQL fixture contains 10 complete vectors and returned
`fixture_count=10`, `mismatch_count=0`.

## Resolved mismatches

### P7A-M01 — size-master adjustment was counted as transaction price

- Symptom: duplicated adjustment could inflate a price.
- Complete input: base 45,000; variant adjustment 0; sellable variant-size
  adjustment 2,000; size-master presentation adjustment 3,000; quantity 1.
- Before: TypeScript returned 50,000.
- Canonical database output: 47,000.
- Authority: sellable SKU/variant-size adjustment, not size master.
- Root cause: `lib/product-utils.ts:57` and
  `lib/bulk-ordering.ts:490` added both values.
- Data flow: PIM product → shared price helper → cart/Custom price.
- Fix: both helpers now use only
  `product_variant_sizes.price_adjustment`.
- Regression: `test/p7a-pricing-parity.test.ts` verifies 47,000; the existing
  cart and Custom fixtures were realigned without changing expected business
  totals.

### P7A-M02 — revalidation ignored canonical `tier_scope`

- Symptom: a `tier_scope='none'` product could receive a product tier.
- Complete input: quantity/pricing quantity 24; base 45,000; variant adjustment
  1,000; variant-size adjustment 2,000; active 24+ tier 40,000;
  `tier_scope='none'`.
- Before: shared tier helper returned 43,000.
- Canonical database output: 48,000 with no applied tier.
- Authority: `finalize_public_ready_stock_pricing_v1`, migration lines
  170–201.
- Root cause: `lib/supabase/products.ts` did not select/map `sales_mode`,
  `pricing_mode`, or `tier_scope`, and revalidation always grouped/applied
  product tiers.
- Data flow: products query → `revalidateCartItems` → numeric tier helper.
- Fix: the product reader now maps all three commerce fields and
  `resolveReadyStockPricing` applies tiers only for `tier_scope='product'`.
- Regression: TypeScript and SQL fixtures both return 48,000 and `tierId=null`.

### P7A-M03 — quotation tier received an invented numeric price

- Symptom: a quote-only quantity could be represented as a stale numeric
  `ok`/`price_changed` result.
- Complete input: quantity 50; base 45,000; adjustments 1,000 + 2,000; active
  tier 50+ with `unit_price=null`, `quote_required=true`.
- Before: numeric helper fell back to base and returned 48,000.
- Canonical database output: `quotation_required`, no unit price; checkout SQL
  raises `Jumlah produk memerlukan quotation`.
- Authority: OD-08 and canonical Ready Stock finalizer lines 194–201.
- Root cause: `calculateTieredUnitPrice` has a number-only return contract and
  revalidation did not carry quotation status.
- Data flow: active tier → null tier price → base-price fallback → revalidation.
- Fix: discriminated pricing decision returns
  `PRICING_QUOTATION_REQUIRED`, `unitPrice=null`; revalidation exposes
  `status='quotation_required'` and blocks add/checkout consumers already
  filtering non-`ok` results.
- Regression: TypeScript and SQL fixtures return the same status, tier, and
  null amount.

### P7A-M04 — sample catalog could enter transaction-critical revalidation

- Symptom: when the public Supabase client was absent, a sample SKU could be
  treated as canonical.
- Complete input: no Supabase client; sample product `prod-kcc24`; sample
  variant size `vsize-kcc24-blk-s`; quantity 1; submitted unit price 45,000.
- Before: `listProducts()` returned `sampleProducts`; result could be `ok` at
  45,000 with sample stock 12.
- Expected/fixed output:
  `unavailable / PRICING_PRODUCT_UNAVAILABLE / latest_unit_price=null /
  stock_available=0`.
- Authority: OD-10, OD-15, OD-16.
- Root cause: `lib/supabase/products.ts:149` and the quotation-draft route used
  the presentation fallback default.
- Data flow: missing client → sample catalog → server revalidation/quotation
  draft.
- Fix: both transaction-critical callers use
  `listProducts({ allowFallback: false })`.
- Regression: mocked missing-client test proves the complete fail-closed
  response.

## Explicit blockers

### P7A-B01 — SQL transaction limits differ from OD-07

Status: **BLOCKED — owner package P7B**

- Input A: one Ready Stock line, quantity 101.
- TypeScript output: rejected (`null`) because max per line is 100.
- Live SQL quantity gate: accepted because
  `create_public_checkout_order` checks `1..10000`.
- Input B: six distinct lines with quantities `100,100,100,100,100,1`
  (501 total).
- TypeScript output: rejected (`null`) because aggregate max is 500.
- Live SQL quantity gate: no aggregate rejection exists.
- End-to-end order creation for these inputs: **NOT PROVEN**; it was not
  executed because that would create production transaction rows and also
  depends on live stock.
- Evidence: `lib/commerce-checkout.ts:8-10,71-91`,
  `supabase/migrations/20260714090000_commerce_foundation_v1_p0.sql:385`, and
  the live `pg_get_functiondef` output.
- Reason not fixed in P7A: the frozen package map assigns SQL enforcement and
  migration to P7B. Editing an already-applied migration is prohibited.

### P7A-B02 — Ready Stock SQL does not enforce minimum/quotation thresholds

Status: **BLOCKED — owner package P7B**

- Input A: active minimum rule `minimum_quantity=12`, quantity 1.
- TypeScript policy output: blocking `minimum_quantity` error.
- Current Ready Stock SQL output: no minimum-rule check; pricing continues if
  other canonical checks pass.
- Input B: active `quotation_quantity=50`, quantity 50, no quote-required tier.
- TypeScript cart/presentation output: `quoteRequired=true`, no valid checkout
  total.
- Current Ready Stock SQL output: priced because it only checks
  `product_price_tiers.quote_required`.
- Current live-data impact: none observed because the active database has zero
  active `product_minimum_rules`; latent behavior remains proven by function
  definition.
- Evidence: `lib/bulk-ordering.ts:261-277`,
  `lib/cart-tier-pricing.ts:97-106`, and live
  `create_public_checkout_order`/`finalize_public_ready_stock_pricing_v1`
  definitions.
- Reason not fixed in P7A: SQL runtime enforcement belongs to P7B and requires
  an additive, Preview-tested migration.

## Verification

- TypeScript parity: 17 P7A tests, all PASS.
- Related pricing/cart/Custom/checkout suite: 63 tests, all PASS.
- SQL parity fixture: 10 vectors, 0 mismatch, PASS.
- `pnpm typecheck`: PASS.
- `pnpm lint`: PASS with 0 errors and 34 pre-existing warnings.
- `pnpm test`: PASS, 75 files / 596 tests.
- `pnpm build`: PASS, 110/110 pages generated.

## Database and historical data

- Migration created: none.
- Migration applied: none.
- Remote mutation: none.
- Historical order and pricing snapshots: untouched.
- Pricing formula authority was aligned, not replaced.
- Deployment/commit/push/merge: none.
