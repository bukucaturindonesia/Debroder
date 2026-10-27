# Staging configuration requirements

Preparation only. Do not activate the fast feature, change deployment configuration or create a provider transaction from this document.

| Requirement | Current evidence |
|---|---|
| `DEBRODER_ENV=staging` and Supabase URL/ref matching the authorized project | Enforced in source; actual deployment unknown |
| `DEBRODER_FAST_CHECKOUT_ENABLED` | Keep OFF pending authorization and acceptance |
| Server Supabase credential / `SUPABASE_SERVICE_ROLE_KEY` | Presence unverified; server secret manager only |
| `FAST_CHECKOUT_SIGNING_SECRET` | Presence unverified; no value requested |
| `MIDTRANS_ENV=sandbox` | Required in source; deployment unknown |
| `MIDTRANS_SERVER_KEY`, `MIDTRANS_CLIENT_KEY`, `MIDTRANS_MERCHANT_ID` | Configuration presence unverified; never paste keys in reports or Git |
| `RAJAONGKIR_API_KEY`, approved shipping origin/couriers | Configuration and provider UAT unknown |
| `NEXT_PUBLIC_SITE_URL` | Must map to the approved HTTPS staging application |
| Public webhook | Same approved application origin, exact `/api/payments/midtrans/notification`; reachability/merchant-dashboard binding unverified |
| Application source SHA | Must match the reviewed candidate, not merely the project name |

The readiness snapshot contains only nonsecret metadata. Unknown values stay null/false. The offline tool validates declarations and URL/SHA consistency; it never reads environment credentials, contacts a provider, activates a feature, applies SQL or proves runtime readiness.

Required external access: readable Vercel project/deployment metadata and a named HTTPS staging application. Credentials must be configured by an authorized owner directly in the appropriate secret manager. No production credentials or payment attempts are needed for local preparation.
