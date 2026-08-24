# DEBRODER Fresh Database Replay Manifest

**Status:** repository-only implementation artifact
**Generated:** 2026-08-16
**Remote database changed:** NO
**Staging reset:** NO
**Production changed:** NO

This manifest defines the only proposed fresh-database replay order. It is
not authorization to run against staging or production.

## Classification

- **BASELINE:** the new repository-controlled foundation migration.
- **RUN:** execute at the listed logical position.
- **REORDER:** execute, but at the logical position below rather than at its
  filename position.
- **COMPATIBILITY:** execute as a compatibility bridge, never as a second
  domain authority.
- **REPLACED BY BASELINE:** retained historical file whose fresh-install
  schema responsibility is supplied by the baseline.
- **HISTORICAL ONLY:** evidence or `_applied` marker; never executable.
- **DO NOT RUN:** manual, seed, or standalone artifact outside replay.

## Topological order

```text
EMPTY SUPABASE
 -> 20260816102253_debroder_fresh_database_baseline.sql [BASELINE]
 -> 20260711010000_v1_1_bulk_custom_ordering.sql [RUN]
 -> 20260711154141_v1_1_bulk_custom_ordering_compatibility.sql [COMPATIBILITY]
 -> 20260712070227_phase6_document_numbering.sql [RUN]
 -> 20260712091640_v1_2_phase_6_numbering_history_and_alignment.sql [RUN]
 -> 20260712091712_v1_2_phase_6_numbering_allocator_and_registry.sql [RUN]
 -> 20260712091748_v1_2_phase_6_numbering_lifecycle_and_security.sql [RUN]
 -> 20260712093500_v1_2_phase_6_permanent_delete_audit_and_sequence_cleanup.sql [RUN]
 -> 20260712070529_phase7_to_phase9_production_foundation.sql [REORDER]
 -> 20260712095523_v1_2_phase_7_job_order_foundation_and_security.sql [RUN]
 -> 20260712095652_v1_2_phase_7_job_order_creation_atomic_number.sql [RUN]
 -> 20260712100924_v1_2_phase_7_notification_dependency_ambiguity_fix.sql [RUN]
 -> 20260712101029_v1_2_phase_7_job_order_history_trigger_alignment.sql [RUN]
 -> 20260712115943_v1_2_phase_8_work_item_schema_and_audit.sql [RUN]
 -> 20260712120223_v1_2_phase_8_work_item_creation_and_dependencies.sql [RUN]
 -> 20260712120309_v1_2_phase_8_work_item_status_and_archive.sql [RUN]
 -> 20260712120353_v1_2_phase_8_work_item_security_and_delete.sql [RUN]
 -> 20260712131753_v1_2_phase_9_production_status_and_progress.sql [RUN]
 -> 20260712132103_v1_2_phase_9_job_order_status.sql [RUN]
 -> 20260712132131_v1_2_phase_9_work_item_status.sql [RUN]
 -> 20260712142905_v1_2_phase_5b_payment_completion.sql [RUN]
 -> 20260712143745_v1_2_phase_5b_payment_audit_lock.sql [RUN]
 -> 20260712145657_v1_2_phase_10_qc_schema_security.sql [RUN]
 -> 20260712150010_v1_2_phase_10_qc_begin_only_check.sql [RUN]
 -> 20260712150036_v1_2_phase_10_qc_create_record.sql [RUN]
 -> 20260712150101_v1_2_phase_10_qc_update_draft.sql [RUN]
 -> 20260712150123_v1_2_phase_10_qc_archive_restore.sql [RUN]
 -> 20260712150203_v1_2_phase_10_qc_completion_integration.sql [RUN]
 -> 20260712150646_v1_2_phase_10_qc_remove_file.sql [RUN]
 -> 20260712150711_v1_2_phase_10_qc_permanent_delete_alignment.sql [RUN]
 -> 20260712154540_v1_2_phase_11_fulfillment_schema_and_audit.sql [RUN]
 -> 20260712154619_v1_2_phase_11_fulfillment_create_and_update.sql [RUN]
 -> 20260712154659_v1_2_phase_11_fulfillment_status_and_sync.sql [RUN]
 -> 20260712154952_v1_2_phase_11_fulfillment_lifecycle.sql [RUN]
 -> 20260712155021_v1_2_phase_11_fulfillment_delete_audit.sql [RUN]
 -> 20260712155146_v1_2_phase_11_fulfillment_security.sql [RUN]
 -> 20260712155210_v1_2_phase_11_fulfillment_table_grants.sql [RUN]
 -> 20260712155229_v1_2_phase_11_fulfillment_rpc_grants.sql [RUN]
 -> 20260712155253_v1_2_phase_11_fulfillment_bucket.sql [RUN]
 -> 20260712155305_v1_2_phase_11_fulfillment_storage_policy_cleanup.sql [RUN]
 -> 20260712155315_v1_2_phase_11_fulfillment_storage_read.sql [RUN]
 -> 20260712155326_v1_2_phase_11_fulfillment_storage_upload.sql [RUN]
 -> 20260712155341_v1_2_phase_11_fulfillment_storage_delete.sql [RUN]
 -> 20260713002645_v1_2_phase_11_archived_file_cleanup.sql [RUN]
 -> 20260713003444_v1_2_phase_11_history_trigger_alignment.sql [RUN]
 -> all remaining RUN migrations in the classification table, in timestamp order
 -> 20260815212358_wave_0c_quotation_snapshot_security.sql [RUN]
 -> 20260817151630_order_task_sla_policies_security.sql [RUN]
 -> 20260817154449_product_compatibility_enum_safety.sql [RUN]
 -> 20260818003941_order_handoff_trigger_record_safety.sql [RUN]
 -> 20260818020559_customer_auth_server_acl_v1.sql [RUN]
 -> 20260819132837_wave_1_commerce_quotation_atomicity.sql [RUN]
 -> 20260819141452_wave_1_quotation_order_conversion.sql [RUN]
 -> 20260819141725_wave_1_quotation_order_conversion_contract_correction.sql [RUN]
 -> 20260819144205_wave_1_quotation_order_service_snapshot.sql [RUN]
 -> 20260819144405_wave_1_order_item_service_trigger_contract.sql [RUN]
 -> 20260820063850_wave_1_quotation_admin_read_grants.sql [RUN]
 -> 20260820064224_wave_1_order_detail_read_grants.sql [RUN]
 -> 20260820065821_wave_1_admin_shell_read_grants.sql [RUN]
 -> CURRENT HEAD
```

The production foundation is explicitly reordered because its callable
functions allocate document numbers. The two modern product migrations are
not replayed because their responsibilities are covered by the enum-safe
baseline and its compatibility projections.

The baseline also supplies the schema-only CMS foundations required by the
first executable commerce-experience migration: `public.page_heroes` and
`public.cms_banners`, including the current visual/workflow columns, RLS,
published-read policies, and permission-gated authenticated management. No
editorial rows or media/storage objects are part of the baseline. The Jersey
experience migrations remain additive extensions of this shared CMS authority.

The baseline also supplies the schema-only `public.product_color_master` PIM
authority required by the first executable bulk-import migration. Its columns,
unique color slug, active/sort index, updated-at trigger, RLS, active read
policy, and staff-managed write policy are replayed without any color master
rows. The standalone master-data SQL remains forensic/seed evidence and is not
part of fresh replay.

The baseline also supplies the modern product-commerce fields required before
the later canonical commerce migration: `product_type`, `pricing_mode`,
`uses_configurator`, `minimum_order_qty`, and the schema-only
`product_subcategories`/`product_size_guides` links. `sales_mode` and
`tier_scope` remain owned by `20260723035324...`; they are not duplicated in
the baseline.

### Phase 5A payment preflight

The baseline now reconstructs the legitimate Phase 5A prerequisite family
from `20260712060316_payment_tracking_phase_5a.sql`: payment numbering,
`public.order_payments`, the summary/create RPCs, and the exact draft,
verify, reject, archive, restore, and permanent-delete signatures required
by the Phase 5B ACL migration. The baseline remains the sole payment
authority; it does not copy the historical storage bucket or create the
Phase 5B submission/adjustment/activity tables.

The historical `submit_public_payment_proof(uuid,text,text,text)` RPC is not
part of the baseline: its old body mutates legacy order proof/status fields,
uses order-number/phone matching as authorization, and has no CURRENT HEAD
caller. The Phase 5B audit migration therefore performs its legacy ACL
cleanup conditionally when that retired object exists, rather than requiring
an unsafe compatibility function or silently skipping the security intent.

No replay order changes are required. `20260712142905_v1_2_phase_5b_payment_completion.sql`
still runs first and creates its own incremental payment objects and the
`payment_actor_role`/`payment_actor_has_role` helpers, followed immediately
by `20260712143745_v1_2_phase_5b_payment_audit_lock.sql`. All other Phase 5B
targets are supplied by the baseline or the preceding completion migration;
the retired public proof target is explicitly conditional.

The forward `20260819095347_wave_0_payment_adjustments_archive_contract.sql`
entry runs after the existing current migration chain. It is intentionally
additive: Phase 5B remains the table creator, while the later CURRENT HEAD
summary/review contract receives the missing lifecycle column before any
staging fixture or payment-review operation can execute. Historical payment
migrations remain unchanged.

The later `20260721090000_p0_security_critical_legacy_containment_c1.sql`
remains `RUN` at its existing position, with explicit dual-mode semantics:

- On a fresh CURRENT HEAD install, the retired RPCs and the historical
  `order-uploads` policy/bucket may be absent. Absence is valid and the
  migration does not create or require those objects.
- On a legacy upgrade, each exact RPC is hash-checked and its ACL must be
  be either the known historical anon/authenticated pre-containment pair
  (service-role execution may be absent, as in `schema.sql`) or the already-
  contained state. Trusted ownership is also required. Matching objects are
  then reduced to service-role execution only.
- If the named historical policy exists, its exact anonymous INSERT shape is
  validated before it is dropped. A public `order-uploads` bucket or any
  unexpected function/policy identity fails closed.

This preserves the historical security-containment intent without adding the
retired API or legacy upload surface to the fresh-install baseline.

## Exhaustive classification of the 151 repository-controlled migration files

| File | Class |
|---|---|
| `20260711000000_v1_0_product_foundation.sql` | REPLACED BY BASELINE |
| `20260711010000_v1_1_bulk_custom_ordering.sql` | RUN |
| `20260711154031_v1_0_product_foundation_compatibility.sql` | REPLACED BY BASELINE |
| `20260711154141_v1_1_bulk_custom_ordering_compatibility.sql` | COMPATIBILITY |
| `20260712070227_phase6_document_numbering.sql` | RUN |
| `20260712070529_phase7_to_phase9_production_foundation.sql` | REORDER |
| `20260712091640_v1_2_phase_6_numbering_history_and_alignment.sql` | RUN |
| `20260712091712_v1_2_phase_6_numbering_allocator_and_registry.sql` | RUN |
| `20260712091748_v1_2_phase_6_numbering_lifecycle_and_security.sql` | RUN |
| `20260712093500_v1_2_phase_6_permanent_delete_audit_and_sequence_cleanup.sql` | RUN |
| `20260712095523_v1_2_phase_7_job_order_foundation_and_security.sql` | RUN |
| `20260712095652_v1_2_phase_7_job_order_creation_atomic_number.sql` | RUN |
| `20260712100924_v1_2_phase_7_notification_dependency_ambiguity_fix.sql` | RUN |
| `20260712101029_v1_2_phase_7_job_order_history_trigger_alignment.sql` | RUN |
| `20260712115943_v1_2_phase_8_work_item_schema_and_audit.sql` | RUN |
| `20260712120223_v1_2_phase_8_work_item_creation_and_dependencies.sql` | RUN |
| `20260712120309_v1_2_phase_8_work_item_status_and_archive.sql` | RUN |
| `20260712120353_v1_2_phase_8_work_item_security_and_delete.sql` | RUN |
| `20260712131753_v1_2_phase_9_production_status_and_progress.sql` | RUN |
| `20260712132103_v1_2_phase_9_job_order_status.sql` | RUN |
| `20260712132131_v1_2_phase_9_work_item_status.sql` | RUN |
| `20260712142905_v1_2_phase_5b_payment_completion.sql` | RUN |
| `20260712143745_v1_2_phase_5b_payment_audit_lock.sql` | RUN |
| `20260712145657_v1_2_phase_10_qc_schema_security.sql` | RUN |
| `20260712150010_v1_2_phase_10_qc_begin_only_check.sql` | RUN |
| `20260712150036_v1_2_phase_10_qc_create_record.sql` | RUN |
| `20260712150101_v1_2_phase_10_qc_update_draft.sql` | RUN |
| `20260712150123_v1_2_phase_10_qc_archive_restore.sql` | RUN |
| `20260712150203_v1_2_phase_10_qc_completion_integration.sql` | RUN |
| `20260712150646_v1_2_phase_10_qc_remove_file.sql` | RUN |
| `20260712150711_v1_2_phase_10_qc_permanent_delete_alignment.sql` | RUN |
| `20260712154540_v1_2_phase_11_fulfillment_schema_and_audit.sql` | RUN |
| `20260712154619_v1_2_phase_11_fulfillment_create_and_update.sql` | RUN |
| `20260712154659_v1_2_phase_11_fulfillment_status_and_sync.sql` | RUN |
| `20260712154952_v1_2_phase_11_fulfillment_lifecycle.sql` | RUN |
| `20260712155021_v1_2_phase_11_fulfillment_delete_audit.sql` | RUN |
| `20260712155146_v1_2_phase_11_fulfillment_security.sql` | RUN |
| `20260712155210_v1_2_phase_11_fulfillment_table_grants.sql` | RUN |
| `20260712155229_v1_2_phase_11_fulfillment_rpc_grants.sql` | RUN |
| `20260712155253_v1_2_phase_11_fulfillment_bucket.sql` | RUN |
| `20260712155305_v1_2_phase_11_fulfillment_storage_policy_cleanup.sql` | RUN |
| `20260712155315_v1_2_phase_11_fulfillment_storage_read.sql` | RUN |
| `20260712155326_v1_2_phase_11_fulfillment_storage_upload.sql` | RUN |
| `20260712155341_v1_2_phase_11_fulfillment_storage_delete.sql` | RUN |
| `20260713002645_v1_2_phase_11_archived_file_cleanup.sql` | RUN |
| `20260713003444_v1_2_phase_11_history_trigger_alignment.sql` | RUN |
| `20260713090000_v1_2_phase_13_role_catalog_and_rls_alignment.sql` | RUN |
| `20260713091500_v1_2_phase_13_production_history_rls.sql` | RUN |
| `20260713143000_commerce_jersey_experience.sql` | RUN |
| `20260713201237_payment_authenticated_actor_acl_correction.sql` | RUN |
| `20260713223000_jersey_owner_approved_experience_addendum.sql` | RUN |
| `20260714005325_guest_order_tracking_security.sql` | RUN |
| `20260714090000_commerce_foundation_v1_p0.sql` | RUN |
| `20260714100000_commerce_foundation_v1_p0_checkout_variable_correction.sql` | RUN |
| `20260714101500_commerce_foundation_v1_p0_checkout_variable_normalization.sql` | RUN |
| `20260714103000_commerce_foundation_v1_p0_whatsapp_digest_schema.sql` | RUN |
| `20260714104500_commerce_foundation_v1_p0_sequence_rls_lock.sql` | RUN |
| `20260714110000_commerce_foundation_v1_p0_ready_stock_fulfillment_bridge.sql` | RUN |
| `20260714111500_commerce_foundation_v1_p0_notification_render_resilience.sql` | RUN |
| `20260715050713_p0_security_acl_actor_directory.sql` | RUN |
| `20260715053035_p0_security_canonical_cancellation.sql` | RUN |
| `20260715054519_p0_security_controlled_stale_reservation_cleanup.sql` | HISTORICAL ONLY |
| `20260715060557_p0_security_checkout_abuse_protection.sql` | RUN |
| `20260715104222_pim_phase_1_product_lifecycle_consolidation.sql` | RUN |
| `20260715223043_admin_three_roles_read_only.sql` | RUN |
| `20260716143000_pim_phase_4_bulk_import_atomic.sql` | RUN |
| `20260717093000_pim_phase_5_bulk_edit_atomic.sql` | RUN |
| `20260717160000_custom_commerce_foundation.sql` | RUN |
| `20260717173000_custom_commerce_cms_alignment.sql` | RUN |
| `20260717193000_pim_phase_6_export_reconciliation.sql` | RUN |
| `20260718100000_pim_phase_7_audit_operations_history.sql` | RUN |
| `20260718113000_custom_pricing_payment_final_guard.sql` | RUN |
| `20260718150000_custom_admin_operational_hotfix.sql` | RUN |
| `20260718180000_custom_order_end_to_end_revision.sql` | RUN |
| `20260718181000_indonesia_regions_province_regency_district_seed.sql` | RUN |
| `20260718182000_indonesia_regions_village_postal_seed.sql` | RUN |
| `20260718182500_custom_checkout_address_snapshot_method.sql` | RUN |
| `20260719110000_admin_order_pricing_workspace.sql` | RUN |
| `20260719140000_payment_verification_and_fulfillment.sql` | RUN |
| `20260720010000_order_integrity_handoff_phase0_3.sql` | RUN |
| `20260720014220_fix_ready_stock_trigger_record_field.sql` | RUN |
| `20260720014603_fix_cross_table_trigger_record_resolution.sql` | RUN |
| `20260720020000_order_operations_phase4_13.sql` | RUN |
| `20260720030000_human_centered_order_experience_p0.sql` | RUN |
| `20260720034655_fix_order_handoff_digest_schema_qualification.sql` | RUN |
| `20260720035945_fix_pay_at_store_final_verification.sql` | RUN |
| `20260720040000_restore_order_task_authenticated_select_grants.sql` | RUN |
| `20260721090000_p0_security_critical_legacy_containment_c1.sql` | RUN |
| `20260722194500_p0_hotfix_02_public_media_pickup_idempotency.sql` | RUN |
| `20260723035324_batch_4_canonical_commerce_foundation_v1.sql` | RUN |
| `20260723035606_batch_4_product_commerce_defaults_sync_v1.sql` | RUN |
| `20260723061956_batch_4_a3_checkout_integrity_v1.sql` | RUN |
| `20260723193533_p7b_policy_database_alignment_v1.sql` | RUN |
| `20260724011535_p8b_size_adjustment_data_mutation_v1.sql` | HISTORICAL ONLY |
| `20260724054241_p15_inventory_authority_stock_ownership_v1.sql` | RUN |
| `20260724054617_p15_inventory_reservation_reconciliation_v1.sql` | RUN |
| `20260724055608_p15_consume_idempotency_correction_v1.sql` | RUN |
| `20260725070355_admin_rbac_direct_roles_v1.sql` | RUN |
| `20260725073814_admin_rbac_restore_anon_is_superadmin_execute.sql` | RUN |
| `20260725074004_admin_rbac_restore_anon_rls_predicate_execute.sql` | RUN |
| `20260726090522_global_dashboard_store_scope_restrictive_rls.sql` | RUN |
| `20260726160000_global_ready_stock_instant_custom_v1.sql` | RUN |
| `20260726162000_instant_custom_operations_alignment_v1.sql` | RUN |
| `20260726164000_public_canonical_inventory_availability_v1.sql` | RUN |
| `20260726165000_jersey_experimental_public_copy_correction_v1.sql` | RUN |
| `20260727073246_p15_zero_balance_matrix_completion_v1.sql` | HISTORICAL ONLY |
| `20260727160000_security_function_reachability_acl_v1.sql` | RUN |
| `20260728153142_canonical_trial_pricing_v1.sql` | HISTORICAL ONLY |
| `20260729013734_canonical_product_data_publication_readiness_v1.sql` | HISTORICAL ONLY |
| `20260729033931_configured_jersey_checkout_v1.sql` | RUN |
| `20260729033946_provisional_product_primary_images_v1.sql` | HISTORICAL ONLY |
| `20260729045016_ready_stock_fulfillment_trigger_record_fix_v1.sql` | RUN |
| `20260729141510_cotton_combed_tier_pricing_canonical_closure_v1.sql` | HISTORICAL ONLY |
| `20260730122821_transaction_notification_admin_recovery_v1.sql` | RUN |
| `20260801045549_kaos_polos_editorial_section_types_v1.sql` | RUN |
| `20260801115245_pay_at_store_pickup_canonical_workflow_v1.sql` | RUN |
| `20260801134645_pay_at_store_pickup_task_ledger_alignment_v1.sql` | RUN |
| `20260801200909_pay_at_store_pickup_payment_resolver_null_alignment_v1.sql` | RUN |
| `20260801204856_pay_at_store_cash_evidence_alignment_v1.sql` | RUN |
| `20260802090000_admin_account_role_experience_v1.sql` | RUN |
| `20260806214500_customer_account_email_verification_v1.sql` | RUN |
| `20260806234500_customer_checkout_activation_integrity_v2.sql` | RUN |
| `20260810100000_registered_customer_order_access_v1.sql` | RUN |
| `20260815212358_wave_0c_quotation_snapshot_security.sql` | RUN |
| `20260817151630_order_task_sla_policies_security.sql` | RUN |
| `20260817154449_product_compatibility_enum_safety.sql` | RUN |
| `20260818003941_order_handoff_trigger_record_safety.sql` | RUN |
| `20260818020559_customer_auth_server_acl_v1.sql` | RUN |
| `20260819132837_wave_1_commerce_quotation_atomicity.sql` | RUN |
| `20260819141452_wave_1_quotation_order_conversion.sql` | RUN | Add the explicit, atomic quotation-to-order transaction boundary and one-order/idempotency guards. |
| `20260819141725_wave_1_quotation_order_conversion_contract_correction.sql` | RUN | Correct the conversion values to the active order customer and locked custom-quote contracts without rewriting the applied migration. |
| `20260819144205_wave_1_quotation_order_service_snapshot.sql` | RUN | Align quotation conversion service snapshots with the existing order-item service trigger contract and remove the competing direct service insert. |
| `20260819144405_wave_1_order_item_service_trigger_contract.sql` | RUN | Correct the applied service-sync trigger to the actual canonical order_item_services columns without adding shadow columns. |
| `20260818082607_wave_0_public_store_scope_customer_rls.sql` | RUN |
| `20260819060740_wave_0_ready_stock_pricing_status_compatibility.sql` | RUN |
| `20260819064125_wave_0_service_role_qc_read_contract.sql` | RUN |
| `20260819085144_wave_0_admin_order_read_grants.sql` | RUN | Restore authenticated read privilege for RLS-protected order surfaces; policies remain the authorization boundary. |
| `20260819091348_wave_0_trigger_function_acl_containment.sql` | RUN | Revoke direct browser/service-role execution from trigger-only SECURITY DEFINER functions; table triggers remain their only callers. |
| `20260819095347_wave_0_payment_adjustments_archive_contract.sql` | RUN | Add the missing archived-at lifecycle field required by CURRENT HEAD payment summary and review execution; preserve Phase 5B ownership and ACLs. |
| `20260820063850_wave_1_quotation_admin_read_grants.sql` | RUN | Restore authenticated reads for the RLS-protected quotation and mockup graph used by the Admin quotation workspace. |
| `20260820064224_wave_1_order_detail_read_grants.sql` | RUN | Restore authenticated order-payment reads while retaining the existing payment RLS policy as the authorization boundary. |
| `20260820065821_wave_1_admin_shell_read_grants.sql` | RUN | Restore authenticated reads for the RLS-protected notification and repeat-order support panels. |
| `mockup_approval_foundation_phase_3a_applied.sql` | HISTORICAL ONLY |
| `mockup_public_approval_phase_3b_applied.sql` | HISTORICAL ONLY |
| `order_conversion_phase_4_applied.sql` | HISTORICAL ONLY |
| `order_conversion_phase_4_security_lock_applied.sql` | HISTORICAL ONLY |
| `payment_tracking_phase_5a_applied.sql` | HISTORICAL ONLY |
| `quotation_item_lifecycle_phase_1c_applied.sql` | HISTORICAL ONLY |
| `quotation_lifecycle_phase_1e_applied.sql` | HISTORICAL ONLY |
| `quotation_service_lifecycle_phase_1d_applied.sql` | HISTORICAL ONLY |
| `quotation_versioning_phase_2_applied.sql` | HISTORICAL ONLY |

> Note: the `20260711154031...` row appears once in the authoritative table
> above; the topological section intentionally references it only as a
> replacement, never as an executable step.

The stale-reservation cleanup migration is intentionally `HISTORICAL ONLY`.
It is an operational data-remediation script whose SQL requires exactly two
pre-existing expired reservations belonging to archived orders, mutates those
rows, and records before/after audit evidence. A fresh database has no such
rows by contract, so running it would require prohibited business-data seed
rows and would make fresh replay depend on hidden historical state. Its
security intent remains preserved by the current reservation lifecycle and
cleanup contracts; the file is retained unchanged as historical/upgrade
evidence.

The P8B size-adjustment migration is intentionally `HISTORICAL ONLY`. It is
an owner-approved mutation of a specific pre-existing 287-row product/SKU
cohort: it requires the exact preview fingerprint, existing active/draft
counts, canonical SKUs, prior price adjustments, and matching audit history,
then writes product pricing and audit rows. A fresh database has zero such
business rows by contract, so replaying it would require prohibited product
seed data and hidden historical state. The migration remains unchanged as
upgrade/remediation evidence; the canonical `product_variant_sizes` pricing
authority and its security/audit controls remain in the baseline and
incremental schema chain.

The P15 zero-balance matrix completion migration is intentionally
`HISTORICAL ONLY`. Its reusable `ensure_active_inventory_balance_matrix_v1`
function and insert/update trigger family are reconstructed in the baseline,
but its executable body asserts an exact historical 96-row product/location
cohort and mutates inventory balances plus audit rows. A fresh database has
no product, SKU, or location rows by contract, so replaying that cohort
mutation would require prohibited business seed data. The baseline retains
the canonical inventory-matrix authority and fail-closed service-role ACL;
the original file remains unchanged for historical upgrade evidence.

`20260727160000_security_function_reachability_acl_v1.sql` remains `RUN`.
Its preflight now validates the security invariant that numbering wrappers
are not executable by `PUBLIC` or `anon`, while accepting the legitimate
trusted-role ACL variants produced by the preceding chain: Phase 6 may grant
`authenticated`, Phase 5B may revoke that grant for payment numbering, and
the baseline may grant `service_role` for quotation numbering. The migration's
transaction-local postflight then enforces the final `service_role`-only
contract for all three wrappers. Its explicit admin-function allowlist is
validated by signature and `SECURITY DEFINER` identity, while pre-existing
role grants are treated as cleanup targets rather than required state; the
postflight enforces `authenticated`/`service_role` and denies `PUBLIC`/`anon`.
Allowlisted retired signatures that are absent on fresh CURRENT HEAD are
explicitly skipped in preflight, cleanup, and postflight; no stub is created,
while any present legacy function is still contained. This is an ACL
preflight correction, not a skip or replacement of the security migration.

The four canonical-catalog data migrations are intentionally
`HISTORICAL ONLY`: `20260728153142_canonical_trial_pricing_v1.sql`,
`20260729013734_canonical_product_data_publication_readiness_v1.sql`,
`20260729033946_provisional_product_primary_images_v1.sql`, and
`20260729141510_cotton_combed_tier_pricing_canonical_closure_v1.sql`.
They are owner-locked updates to a pre-existing product/store cohort. The
first requires ten existing product identities and the Jersey category; the
second requires the same physical product cohort plus the historical PETTARANI
store; the third requires nine products and two configured Jersey products;
the fourth requires the Cotton Combed product and three existing price tiers.
An empty fresh database has none of those business rows by contract. Replaying
these files would require prohibited catalog seed data or hidden historical
state, so they remain unchanged evidence for an upgrade/remediation path.
The canonical product authority remains the PIM schema, and the disposable
Ready Stock product is created later by the namespace-scoped fixture bootstrap.

## Excluded artifacts

`supabase/schema.sql`, `supabase/seed.sql`, `supabase/make-superadmin.sql`,
CMS setup SQL, product seed SQL, and archived remote migration files are
forensic/manual/seed evidence, not executable replay inputs. They may contain
business rows, environment-specific identities, broad grants, or historical
remote state. They are not replayed. The nine `_applied.sql` files are markers
only; their required schema responsibilities are covered by the baseline
coverage ledger and current incremental migrations.

## Replay invariants

1. Supabase-managed `auth.users` exists before the baseline; the baseline
   creates no Auth trigger and no identity rows.
2. Baseline RLS is enabled for every baseline public table and table access is
   fail-closed until a later migration adds a domain policy and grant.
3. Indonesian order values are normalized once at the baseline write/history
   boundary into canonical English values; readers use English only.
4. `product_size_master` is apparel authority. Its nullable
   `product_size_id` is a one-way projection link to generic `product_sizes`.
5. `build_quotation_snapshot(uuid)` is not executable by `public`, `anon`,
   or `service_role` in the baseline. Wave 0C grants authenticated staff
   execution only after permission revalidation.
6. Baseline SECURITY DEFINER functions use explicit safe search paths and
   authorization or server-only grants; no broad historical grants return.

## Required validation before remote replay

- Run the baseline coverage/static replay test and `git diff --check`.
- Run relevant repository quality gates.
- Run the complete manifest in a disposable local PostgreSQL/Supabase
  environment if Docker/CLI support is available.
- Obtain owner approval for a clean staging reset and replay. This artifact
  has not touched the current staging project.
