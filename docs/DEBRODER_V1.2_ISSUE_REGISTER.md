# DEBRODER v1.2 Issue Register

| ID | Severity | Phase | Problem | Files / DB objects | Status | Verification |
|---|---|---|---|---|---|---|
| V12-001 | High | 5A | Repository migration is marker-only while live DB contains the real payment schema/functions. Fresh rebuild is not reproducible. | `supabase/migrations/payment_tracking_phase_5a_applied.sql`, `order_payments`, payment RPCs | Open | Live schema/RPC audit captured 2026-07-12 |
| V12-002 | High | 5B | Verified balance currently sums only payment rows; no immutable adjustment/reversal/refund ledger. | `refresh_order_payment_summary` | Implemented | Live transaction test produced effective total 40,000 from verified 50,000 and debit 10,000 |
| V12-003 | High | 5B | Payment requirement is hardcoded to 100% of order total. | `orders.payment_requirement_met` | Implemented | Live transaction test verified 50% requirement and production eligibility result |
| V12-004 | High | 5B | No secure tokenized customer payment submission flow. | payment link/public route/storage | Implemented | Main migration applied; route/page production build passed |
| V12-005 | Medium | 5A | Archive UI displays raw `archived_by` UUID. | `PaymentTrackingManager.tsx` | Implemented | Actor email mapping with non-UUID fallback; build passed |
| V12-006 | Critical | 5B | Final payment audit/RPC ACL migration could not be applied because the approval service reached its usage limit. | `20260712143745_v1_2_phase_5b_payment_audit_lock.sql` | Blocked | Supabase migration list confirms only main Phase 5B migration is live |
| V12-007 | High | 13 | Supabase advisors report legacy public sequence tables without RLS and multiple older SECURITY DEFINER functions executable by anon. Payment-specific fixes are in V12-006; remaining modules require Phase 13 consolidation. | Live database advisors | Open | Supabase security advisor 2026-07-12 |
| V12-008 | Critical | 5B–14 | Production changes are frozen. No new SQL, destructive action, or Phase 6–14 menu test is authorized until audit approval. | Production / repository synchronization | Frozen | User instruction recorded 2026-07-12 |

