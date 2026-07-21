# DEBRODER C1 — Backup & Restore Checklist

## Before apply

- [ ] Confirm the target Supabase project reference is `lzennundwqqtyvvcnzbg`.
- [ ] Confirm database backup/PITR is enabled and record the recovery timestamp.
- [ ] Export `supabase_migrations.schema_migrations` as read-only evidence.
- [ ] Save exact definitions and ACLs for:
  - `public.create_public_order(text,text,text,uuid,text,text,text,integer,text,text,text,text)`
  - `public.submit_public_payment_proof(uuid,text,text,text)`
- [ ] Save all three `order-uploads` storage policies.
- [ ] Save `order-uploads` bucket metadata.
- [ ] Save metadata-only manifest for every existing `order-uploads` object.
- [ ] Record aggregate counts for orders, payments, audit rows, and bucket objects.
- [ ] Confirm the B1 source package SHA-256.
- [ ] Confirm the C1 execution package SHA-256.
- [ ] Review the emergency rollback SQL and its security impact.

## Storage requirement

Database backup may not restore storage object bytes. Preserve separately:

- object ID;
- bucket ID;
- object path/name;
- owner ID;
- created/updated timestamps;
- metadata;
- an authorized backup copy when the owner's recovery procedure permits it.

C1 must not delete or move any storage object.

## Restore readiness

- [ ] Verify grants can be restored using the exact function signatures.
- [ ] Verify the anonymous INSERT policy can be recreated exactly.
- [ ] Verify bucket and object metadata remain unchanged.
- [ ] Prefer source-side containment over rollback whenever possible.
- [ ] Never restore the insecure ACL/policy as a permanent steady state.

## After apply

- [ ] Run the complete post-check SQL.
- [ ] Compare object manifest and aggregate counts with the pre-check evidence.
- [ ] Verify canonical checkout and canonical payment flows.
- [ ] Verify admin signed access to the existing `order-uploads` object.
- [ ] Record apply time, migration version, operator, and results.
