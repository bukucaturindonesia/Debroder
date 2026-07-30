import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migrationName =
  "20260727160000_security_function_reachability_acl_v1.sql";
const migrationPath = join("supabase", "migrations", migrationName);
const migration = readFileSync(migrationPath, "utf8");
const compactMigration = migration.replace(/\s+/g, " ").toLowerCase();

const numberingWrappers = [
  "next_order_number",
  "next_payment_number",
  "next_quotation_number"
] as const;

const expectedFingerprints = [
  "2a1ea111ef18f14e2fdeb72cf597e79425e48b0d143804b56a2af9d4b8e53e17",
  "494a35d8215e4facf45a2fa86aeb9b621e75f3af9f424b5f97c31fbe58b5d56c",
  "a605c27d6e1a16eebb32b376f915323edda4514f6273f6d15e08a19240366b5c"
] as const;

const adminFunctions = [
  "public.create_document_number_rule(text,text,boolean,boolean,integer,text,text)",
  "public.update_document_number_rule(text,text,boolean,boolean,integer,text,text,boolean)",
  "public.archive_document_number_rule(text,text)",
  "public.restore_document_number_rule(text)",
  "public.permanently_delete_order(uuid)",
  "public.create_order_payment(uuid,bigint,timestamp with time zone,text,text,text,text,text,text,text,text,text,bigint)",
  "public.update_order_payment_draft(uuid,bigint,timestamp with time zone,text,text,text,text,text)",
  "public.archive_order_payment(uuid,text)",
  "public.restore_order_payment(uuid)",
  "public.permanently_delete_order_payment(uuid)",
  "public.archive_payment_adjustment(uuid,text)",
  "public.restore_payment_adjustment(uuid)",
  "public.permanently_delete_payment_adjustment(uuid)",
  "public.create_payment_submission_link(uuid,timestamp with time zone,integer)",
  "public.revoke_payment_submission_link(uuid,text)",
  "public.archive_payment_submission_link(uuid,text)",
  "public.restore_payment_submission_link(uuid)",
  "public.permanently_delete_payment_submission_link(uuid)",
  "public.update_role_permission(text,text,boolean)",
  "public.transition_quotation_status(uuid,text,text)",
  "public.create_quotation_revision(uuid,text)",
  "public.refresh_quotation_totals(uuid)",
  "public.convert_quotation_to_order(uuid)",
  "public.permanently_delete_quotation(uuid)",
  "public.permanently_delete_quotation_item(uuid)",
  "public.permanently_delete_quotation_item_service(uuid)",
  "public.create_qc_record(uuid,integer,jsonb,text)",
  "public.begin_qc_record(uuid,text)",
  "public.update_qc_record_draft(uuid,integer,jsonb,text)",
  "public.update_qc_record_draft(uuid,integer,jsonb,text,text)",
  "public.archive_qc_record(uuid,text)",
  "public.restore_qc_record(uuid)",
  "public.register_qc_file(uuid,text,text,text,bigint)",
  "public.create_qc_checklist_template(text,text,text,integer)",
  "public.update_qc_checklist_template(uuid,text,text,integer,boolean)",
  "public.archive_qc_checklist_template(uuid,text)",
  "public.restore_qc_checklist_template(uuid)",
  "public.permanently_delete_qc_checklist_template(uuid)"
] as const;

function readSourceTree(root: string): string {
  if (!existsSync(root)) return "";

  return readdirSync(root, { withFileTypes: true })
    .flatMap((entry) => {
      const path = join(root, entry.name);
      if (entry.isDirectory()) return [readSourceTree(path)];
      return /\.(ts|tsx)$/.test(entry.name) ? [readFileSync(path, "utf8")] : [];
    })
    .join("\n");
}

const activeApplicationSource = ["app", "components", "lib"]
  .map(readSourceTree)
  .join("\n");

describe("Security function reachability ACL V1", () => {
  it("creates exactly one additive ACL V1 migration", () => {
    expect(existsSync(migrationPath)).toBe(true);

    const matchingMigrations = readdirSync("supabase/migrations").filter((name) =>
      name.endsWith("_security_function_reachability_acl_v1.sql")
    );

    expect(matchingMigrations).toEqual([migrationName]);
    expect(migration).toContain("begin;");
    expect(migration).toContain("commit;");
  });

  it("fails closed on exact wrapper signatures, SECURITY DEFINER state, fingerprints, and the canonical order rule", () => {
    for (const wrapper of numberingWrappers) {
      expect(migration).toContain(`public.${wrapper}()`);
      expect(migration).toContain(
        `public.${wrapper.replace("next_", "next_")}() is not SECURITY DEFINER`
      );
    }

    for (const fingerprint of expectedFingerprints) {
      expect(migration).toContain(fingerprint);
    }

    expect(migration).toContain("r.prefix = 'ORD-DEB'");
    expect(migration).toContain("r.use_year = true");
    expect(migration).toContain("r.use_month = false");
    expect(migration).toContain("r.padding = 4");
    expect(migration).toContain("r.separator = '-'");
    expect(migration).toContain("r.reset_rule = 'yearly'");
  });

  it("denies PUBLIC, anon, and authenticated while preserving service_role for every numbering wrapper", () => {
    for (const wrapper of numberingWrappers) {
      expect(compactMigration).toContain(
        `revoke execute on function public.${wrapper}() from public, anon, authenticated;`
      );
      expect(compactMigration).toContain(
        `grant execute on function public.${wrapper}() to service_role;`
      );
      expect(migration).toContain(`${wrapper} ACL postflight failed`);
    }
  });

  it("does not rewrite or alter numbering function bodies", () => {
    expect(compactMigration).not.toContain("create or replace function");
    expect(compactMigration).not.toContain("alter function");
    expect(compactMigration).not.toContain("drop function");
    expect(migration).toContain("function_definitions");
    expect(migration).toContain("numbering function definitions changed");
  });

  it("records and rechecks rules, sequences, registry counts, historical numbers, and trigger attachments", () => {
    for (const snapshot of [
      "numbering_rules",
      "numbering_sequences",
      "numbering_registry_counts",
      "historical_order_numbers",
      "attached_triggers"
    ]) {
      expect(migration).toContain(`'${snapshot}'`);
    }

    expect(migration).toContain("numbering rules changed");
    expect(migration).toContain("numbering sequence values changed");
    expect(migration).toContain("numbering registry counts changed");
    expect(migration).toContain("historical order numbers changed");
    expect(migration).toContain("attached trigger set changed");
  });

  it("cannot consume a sequence while proving denied-call ACLs", () => {
    expect(migration).not.toMatch(/\b(?:select|perform)\s+public\.next_(?:order|payment|quotation)_number\s*\(/i);
    expect(migration).not.toMatch(/\b(?:insert|update|delete|truncate)\s+(?:table\s+)?public\.document_number_sequences\b/i);
    expect(migration).toContain("numbering_sequences");
    expect(migration).toContain("numbering sequence values changed");
  });

  it("uses only an explicit admin-function list and preserves authenticated/service_role access", () => {
    for (const signature of adminFunctions) {
      expect(migration).toContain(`('${signature}')`);
    }

    expect(migration).toContain(
      "revoke execute on function %s from public, anon"
    );
    expect(migration).toContain(
      "grant execute on function %s to authenticated, service_role"
    );
    expect(compactMigration).not.toContain("revoke execute on all functions");
    expect(compactMigration).not.toContain("revoke all on all functions");
  });

  it("retains the intentional public mockup token functions", () => {
    expect(migration).toContain("public.get_public_mockup_review(text)");
    expect(migration).toContain(
      "public.submit_mockup_part_decision(text,uuid,text,text)"
    );
    expect(migration).toContain("intentional_public_token_acl");
    expect(migration).toContain(
      "intentional public mockup token ACL changed"
    );
  });

  it("does not revoke RLS authorization helpers", () => {
    for (const helper of [
      "has_permission",
      "has_staff_role",
      "is_current_admin_session",
      "current_actor_role",
      "can_access_order",
      "can_access_store",
      "can_access_inventory_location"
    ]) {
      expect(migration).not.toMatch(
        new RegExp(`revoke[^;]+${helper}\\s*\\(`, "i")
      );
    }
  });

  it("contains no order, payment, numbering-rule, registry, or historical-number mutation", () => {
    for (const protectedRelation of [
      "orders",
      "order_payments",
      "document_number_rules",
      "document_number_sequences",
      "document_number_issues"
    ]) {
      expect(migration).not.toMatch(
        new RegExp(
          `\\b(?:insert\\s+into|update|delete\\s+from|truncate(?:\\s+table)?)\\s+public\\.${protectedRelation}\\b`,
          "i"
        )
      );
    }
  });

  it("keeps active application source from directly calling the sequence wrappers", () => {
    expect(activeApplicationSource).not.toMatch(
      /\.rpc\(["']next_(?:order|payment|quotation)_number["']/
    );
  });
});
