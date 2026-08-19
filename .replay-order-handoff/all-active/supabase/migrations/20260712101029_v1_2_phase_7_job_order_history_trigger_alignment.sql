-- Phase 7 correction: remove the older duplicate immutable trigger.
-- The Phase 7 trigger remains authoritative and permits controlled cleanup only during Super Admin permanent deletion.
drop trigger if exists prevent_job_order_revisions_mutation on public.job_order_revisions;
