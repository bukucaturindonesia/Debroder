# DEBRODER — B1 Source Package and C1 Migration Sequence

## Required order

```text
CP-OWNER-DECISIONS-01
        ↓
Apply B1 changed-files-only package to the approved source baseline
        ↓
Source verification: typecheck, lint, tests, build, runtime dependency checks
        ↓
Confirm backup/PITR and capture storage/database manifests
        ↓
Run C1 read-only pre-check
        ↓
Owner applies forward-only Migration C1
        ↓
Run C1 read-only post-check
        ↓
Canonical checkout/payment and admin-storage smoke verification
        ↓
Only then consider a combined Batch 1 + Batch 2 checkpoint
```

## Why B1 precedes C1

B1 removes the active source calls to the two legacy RPCs and anonymous upload path. Applying C1 before the source dependency is removed can break a stale deployment while leaving the owner without a verified canonical fallback.

## Why C1 remains separate

C1 contains only critical legacy containment. It does not include:

- 72 broader ACL mismatches;
- C2 trigger/internal ACL lock;
- C3 authenticated-staff ACL correction;
- C4 service-role-only correction;
- missing PIM RPC creation;
- any commerce, UI, content, or performance change.

## Checkpoint dependency

A combined checkpoint is allowed only after:

- B1 source package is applied and fully verified;
- C1 is applied by the owner;
- post-check passes;
- no order/payment/storage/audit data is lost;
- runtime canonical flows pass;
- rollback evidence is stored.
