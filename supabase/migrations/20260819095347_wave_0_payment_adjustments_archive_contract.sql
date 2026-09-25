-- Wave 0 payment-adjustment archive contract.
--
-- Phase 5B owns public.payment_adjustments. Later CURRENT HEAD payment
-- summary/review functions intentionally exclude archived adjustments, so
-- the additive lifecycle column must exist before those functions can run.
-- This forward migration preserves the historical Phase 5B file and does
-- not create a second payment authority or widen payment ACLs.
begin;

alter table public.payment_adjustments
  add column if not exists archived_at timestamptz;

create index if not exists payment_adjustments_active_summary_idx
  on public.payment_adjustments(order_id, status, archived_at);

commit;
