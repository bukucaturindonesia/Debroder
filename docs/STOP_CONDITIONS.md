# DEBRODER C1 — Exact Stop Conditions

Do not apply C1 when any condition below is true:

1. The source checkpoint is not `e411c421bb9d719df71b00ce4cdf8fc76bc566e8` plus the approved B1 package.
2. The B1 package SHA-256 is not `03b221916d875fa2c55c7dd839d0029e59ddd7aba5d08a2a80673c30d9280db5`.
3. The target Supabase project is not `lzennundwqqtyvvcnzbg`.
4. `pgcrypto` or its `digest(text,text)` function cannot be located.
5. Either exact legacy RPC signature is missing or has an additional unexpected overload selected by the operator.
6. `create_public_order` SHA-256 differs from `7a46727b98bd2cff278f7052c25711d175613f3aac6ee888615d5448641055f9`.
7. `submit_public_payment_proof` SHA-256 differs from `aecdbdcf357d7fbf8e835e404a13045f231eccdb4faf00059f6aa2a63ba2c1ca`.
8. `anon`, `authenticated`, or `service_role` ACL state differs from the reconciled pre-C1 state.
9. The policy `Customers can upload order files` is missing, duplicated, renamed, or has different semantics.
10. The `order-uploads` bucket is missing or public.
11. Existing storage object metadata cannot be captured.
12. Backup/PITR and rollback evidence are not ready.
13. The currently deployed application still depends on the legacy OrderForm or the two legacy RPCs.
14. An external client or integration still depends on anonymous upload to `order-uploads`.
15. The B1 source package has not passed the available typecheck, lint, test, build, and runtime checks.
16. The migration contains any table/function/bucket deletion or order/payment/audit/storage-object DML.
17. C2, C3, C4, PIM RPC creation, commerce, UI, content, or performance work has been mixed into C1.
18. The remote migration history or latest version changed after pre-check without a fresh reconciliation review.
19. The operator cannot run the post-check immediately after apply.
20. Any new Critical finding appears.
