# Staging audit — 27 October 2026

Scope: owner-authorized read-only inspection. Local branch `codex/auto-order-admin-v1-20261026`, starting HEAD `da03a690b6fa6b16c7b263af2e29dc4de9903357`. Previous wave results are retained; no unrelated tests were repeated.

## Identity and data safety

The connected Supabase project list identifies **debroder-staging**, ACTIVE_HEALTHY, with a different project reference, database hostname and region from DEBRODER APPAREL. This verifies distinct Supabase projects, not application environment binding or a disposable dataset. No production database was queried.

Director-executed aggregate SELECTs returned:

| Aggregate | Count |
|---|---:|
| Auth users | 7 |
| Customer profiles | 3 |
| Staff profiles | 4 |
| Customer addresses | 0 |
| Orders | 15 |
| Orders with a nonempty email field | 15 |
| Payments | 1 |
| Storage objects | 9 |

No identity, email/phone value, order contents or object filename was retrieved. The checked customer tables have no explicit fixture-marker column among the audited marker names. These observations do **not** prove the records are real, or synthetic. Data provenance is UNKNOWN; the project is **not certified disposable or free of real customer data**. Do not delete or sanitize existing records without a separate reviewed authorization.

## Schema, migration and access

Agent03's fresh metadata audit reports 138 applied migrations, latest `20261021041852`. The local 146-version set differs by four remote-only and twelve local-only versions. This is set drift, not an approved apply sequence.

Candidate `20261026045918_fast_checkout_midtrans_rajaongkir_v1.sql` is not applied. Its four fast tables, seven fast RPCs, four product shipping columns and `order_payments.provider_attempt_id` are absent. Fast Checkout/Midtrans UAT therefore cannot start on this target.

Canonical checkout creators, activation, payment summary, operational task sync, ready-stock fulfillment and expiry functions exist. `order_tasks`, `stock_reservations`, `pickup_preparations` and a unique task-key index are present. Fifty inspected canonical triggers are enabled. These are catalog observations, not end-to-end execution evidence.

Public RLS is enabled on 124/124 tables, with 470 policies. Agent03 reports Storage RLS on 8/8 tables, with 18 policies. Six inspected transaction tables deny anonymous SELECT and direct authenticated INSERT/UPDATE/DELETE while allowing authenticated SELECT. Effective row ownership, RPC authorization and cross-store access still need controlled role tests. Enabled flags do not prove those behaviors; [Supabase explains the separate grant/policy checks](https://supabase.com/docs/guides/database/postgres/row-level-security).

The existing expiry job is active every five minutes. Recorded history contains 19,778 succeeded runs and no failed runs, last observed `2026-10-27T02:20Z`. This proves recorded scheduler activity, not the controlled expiry/release scenario for a new UAT order.

Security advisor output contains informational/warning categories requiring review; no automatic grant/RLS change was attempted. Detailed security findings remain restricted. A warning count is not a count of confirmed exploits.

## Application and provider configuration

Agent05's exact Vercel `okdeal/debroder` lookup returned 404. This does not prove the project is absent; the current connector cannot verify its configuration. Staging application URL, source/deployment SHA, environment presence, Midtrans Sandbox merchant setup and reachable HTTPS webhook remain UNVERIFIED.

Source already enforces staging/ref matching, default-OFF fast feature and sandbox-only Midtrans hosts. The webhook source route is `POST /api/payments/midtrans/notification`. It was not called. No secret values, environment-file contents, provider status/recovery or payment endpoints were read or executed.

## UAT decision

| Area | Current readiness |
|---|---|
| Fast checkout / online shipping | BLOCKED: candidate dependencies, configuration, data safety and full integration evidence |
| Online pickup | BLOCKED: same prerequisites, branch fulfillment and single-use pickup contract |
| Fast pay at store | BLOCKED: fast implementation absent; cashier/expiry/payment scope not accepted |
| Legacy pickup/pay at store | Structure exists; runtime and role acceptance NOT RUN |
| Automatic tasks | Canonical structure exists; new gateway-to-full-trigger execution NOT RUN |

**NO-GO for transactional UAT and release.** Remote database mutation, migration application, deployment and configuration changes: NONE. Safe local work continues through the offline readiness tool and review packet; prior 56 tests/6 browser cases are not relabeled as live staging evidence.
