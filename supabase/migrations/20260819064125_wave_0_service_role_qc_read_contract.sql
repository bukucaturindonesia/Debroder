begin;

-- The authenticated customer order read-model is executed server-side with
-- the service role and includes the optional QC relation.  The Phase 10
-- security migration intentionally grants that table only to authenticated
-- staff, which is correct for direct client access but leaves the trusted
-- server read-model unable to resolve the relation on a fresh replay.
-- Grant only SELECT to the server role; do not widen customer or anonymous
-- access and do not grant service-role mutation capability here.
grant select on public.qc_records to service_role;

commit;
