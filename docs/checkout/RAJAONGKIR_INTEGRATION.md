# RajaOngkir Shipping Cost

Status: **IMPLEMENTED / MOCK PASS / external provider BLOCKED**. Source documentation checked 26 October 2026.

Provider API: `https://rajaongkir.komerce.id/api/v1/`, GET `destination/domestic-destination`, POST `calculate/domestic-cost`. Direct search IDs are subdistrict IDs; they are not local Indonesian region codes. No synthetic mapping into the legacy region-code hierarchy is made.

The adapter uses server-side `key` authentication and form-encoded origin, destination, weight in grams, courier codes, price, and package dimensions. Actual account access/response acceptance remains unverified. The official request/header table specifies `key`, while one tips paragraph mentions Bearer; confirm the account contract during first authorized real call instead of silently switching endpoints.

Server key: `RAJAONGKIR_API_KEY`, never `NEXT_PUBLIC_*`. Signing secret: `FAST_CHECKOUT_SIGNING_SECRET`, at least 32 characters, configured through secure server environment management, never chat/Git. API calls use 10-second timeout, no-store, validation, frontend debounce, and persistent per-operation hashed minute buckets. Keys/provider payloads are not written to public logs.

## Quote contract

Destination search returns signed location data. Quote binds origin, verified destination, basket fingerprint, quantities, authoritative subtotal, package weight/dimensions, actual courier/service, cost, settings version, issued time and five-minute expiry. Browser price/weight is ignored. Server re-reads PIM before checkout, requests current provider rates again, rejects changes, then the DB transaction compares the order's canonical subtotal and quote/settings before committing.

PIM fields: products.shipping_weight_grams and shipping_length_cm/shipping_width_cm/shipping_height_cm. Missing/zero/negative values block shipping. Package dimensions currently use maximum length/width and stacked per-item height; **this packing model needs operational validation**. Origin ID must come from a signed search result. Admin chooses active pickup stores by name, not UUID entry. Only provider-returned names, rates, and ETAs are displayed, with up to three distinct cost alternatives; the adapter does not invent Economical/Fast delivery promises.

If provider calls fail, UI keeps address/cart, shows retry, and does not turn failure into zero shipping. Pickup is allowed only when enabled and its active store is configured; canonical order creation checks the store again.

## Remaining acceptance

- Securely configure the account key; verify origin, actual destination and courier access, dimensions/volumetric behavior, tariffs, and quota.
- Validate physical fulfillment origin against canonical inventory reservation/allocation; one configured shipping origin is not proof of multi-location stock origin correctness.
- Test actual stale tariff, changed cart/weight/address, unavailable destination/service, unauthorized and timeout behavior in the selected staging environment.
- Do not call these tests SANDBOX PASS: official Shipping Cost documentation says it uses live rate data. No paid service/account upgrade or shipping order purchase is authorized.

Sources: [endpoint contract](https://rajaongkir.com/docs/shipping-cost/getting_started/endpoint), [search response](https://rajaongkir.com/docs/shipping-cost/endpoint-rajaongkir-for-search-base/search-destination-rajaongkir), [cost request/response](https://rajaongkir.com/docs/shipping-cost/endpoint-rajaongkir-for-search-base/calculate-domestic-cost), [environment explanation](https://rajaongkir.com/docs).
