import { existsSync, readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrationsPath = "supabase/migrations";
const baselineName = "20260816102253_debroder_fresh_database_baseline.sql";
const baselinePath = `${migrationsPath}/${baselineName}`;
const manifestPath = "DEBRODER_FRESH_DATABASE_REPLAY_MANIFEST.md";
const ledgerPath = "DEBRODER_BASELINE_COVERAGE_LEDGER.md";

const baseline = readFileSync(baselinePath, "utf8");
const manifest = readFileSync(manifestPath, "utf8");
const ledger = readFileSync(ledgerPath, "utf8");
const preExistingMigrationFiles = readdirSync(migrationsPath)
  .filter((name) => name.endsWith(".sql") && name !== baselineName)
  .sort();

const manifestEntries = [...manifest.matchAll(
  /^\| `([^`]+\.sql)` \| (BASELINE|RUN|REORDER|COMPATIBILITY|REPLACED BY BASELINE|HISTORICAL ONLY|DO NOT RUN) \|[^\r\n]*$/gmu
)].map((match) => ({ name: match[1], classification: match[2] }));

function uniqueMatches(source: string, pattern: RegExp): string[] {
  return [...source.matchAll(pattern)].map((match) => match[1].toLowerCase());
}

function withoutDollarBodies(source: string): string {
  return source.replace(/\$\$[\s\S]*?\$\$/gmu, "$$BODY$$");
}

describe("DEBRODER fresh baseline identity and replay manifest", () => {
  it("has the CLI-generated baseline and a deterministic manifest", () => {
    expect(existsSync(baselinePath)).toBe(true);
    expect(existsSync(manifestPath)).toBe(true);
    expect(existsSync(ledgerPath)).toBe(true);
    expect(baseline).toMatch(/^begin;\s/u);
    expect(baseline).toMatch(/commit;\s*$/u);
    expect(manifest).toContain("EMPTY SUPABASE");
    expect(manifest).toContain(baselineName);
    expect(manifest).toContain("20260815212358_wave_0c_quotation_snapshot_security.sql");
  });

  it("classifies every pre-existing migration exactly once", () => {
    const names = manifestEntries.map((entry) => entry.name).sort();
    expect(names).toEqual(preExistingMigrationFiles);
    expect(new Set(names).size).toBe(names.length);
    expect(manifestEntries.filter((entry) => entry.classification === "REPLACED BY BASELINE").map((entry) => entry.name))
      .toEqual([
        "20260711000000_v1_0_product_foundation.sql",
        "20260711154031_v1_0_product_foundation_compatibility.sql"
      ]);
    expect(manifestEntries.filter((entry) => entry.classification === "HISTORICAL ONLY")).toHaveLength(16);
    expect(manifestEntries.find((entry) => entry.name === "20260715054519_p0_security_controlled_stale_reservation_cleanup.sql")?.classification)
      .toBe("HISTORICAL ONLY");
    expect(manifestEntries.find((entry) => entry.name === "20260724011535_p8b_size_adjustment_data_mutation_v1.sql")?.classification)
      .toBe("HISTORICAL ONLY");
    expect(manifestEntries.find((entry) => entry.name === "20260727073246_p15_zero_balance_matrix_completion_v1.sql")?.classification)
      .toBe("HISTORICAL ONLY");
    expect(manifestEntries.find((entry) => entry.name === "20260712070529_phase7_to_phase9_production_foundation.sql")?.classification)
      .toBe("REORDER");
  });

  it("keeps schema.sql, seed.sql, and manual setup out of executable entries", () => {
    const executableNames = new Set(manifestEntries.map((entry) => entry.name));
    expect(executableNames.has("schema.sql")).toBe(false);
    expect(executableNames.has("seed.sql")).toBe(false);
    expect(executableNames.has("make-superadmin.sql")).toBe(false);
    expect(manifest).toContain("supabase/schema.sql");
    expect(manifest).toContain("supabase/seed.sql");
  });

  it("does not execute data-bound historical cleanup on a fresh database", () => {
    expect(manifest).toContain("The stale-reservation cleanup migration is intentionally `HISTORICAL ONLY`");
    expect(manifest).toContain("prohibited business-data seed\nrows");
    expect(manifest).not.toMatch(/\| `20260715054519_p0_security_controlled_stale_reservation_cleanup\.sql` \| RUN \|/u);
    expect(manifest).toContain("The P8B size-adjustment migration is intentionally `HISTORICAL ONLY`");
    expect(manifest).not.toMatch(/\| `20260724011535_p8b_size_adjustment_data_mutation_v1\.sql` \| RUN \|/u);
    expect(manifest).toContain("The P15 zero-balance matrix completion migration is intentionally");
    expect(manifest).not.toMatch(/\| `20260727073246_p15_zero_balance_matrix_completion_v1\.sql` \| RUN \|/u);
    const historicalCatalogMigrations = [
      "20260728153142_canonical_trial_pricing_v1.sql",
      "20260729013734_canonical_product_data_publication_readiness_v1.sql",
      "20260729033946_provisional_product_primary_images_v1.sql",
      "20260729141510_cotton_combed_tier_pricing_canonical_closure_v1.sql"
    ];
    for (const migrationName of historicalCatalogMigrations) {
      expect(manifest).toContain(`| \`${migrationName}\` | HISTORICAL ONLY |`);
      expect(manifest).not.toContain(`| \`${migrationName}\` | RUN |`);
    }
    expect(manifest).toMatch(/canonical-catalog data migrations are intentionally\s+`HISTORICAL ONLY`/u);
  });
});

describe("baseline object coverage and prohibited data", () => {
  it("represents the required foundational objects", () => {
    const requiredObjects = [
      "public.profiles",
      "public.stores",
      "public.debroder_schema_versions",
      "public.permission_definitions",
      "public.role_permissions",
      "public.product_categories",
      "public.product_subcategories",
      "public.product_size_guides",
      "public.products",
      "public.product_color_master",
      "public.product_size_master",
      "public.product_sizes",
      "public.product_variants",
      "public.product_variant_images",
      "public.product_variant_sizes",
      "public.page_heroes",
      "public.cms_banners",
      "public.quotations",
      "public.quotation_versions",
      "public.mockup_sets",
      "public.orders",
      "public.order_items",
      "public.order_status_history",
      "public.order_payments",
      "public.fulfillments",
      "public.notification_events",
      "public.notifications",
      "public.system_audit_log",
      "public.repeat_order_history"
    ];

    for (const objectName of requiredObjects) {
      expect(baseline.toLowerCase()).toContain(objectName.toLowerCase());
    }
  });

  it("accounts for every replaced-migration coverage category", () => {
    const requiredBaselineTokens = [
      "pgcrypto",
      "product_status",
      "variant_status",
      "size_status",
      "variant_image_role",
      "product_variants_sku_unique_idx",
      "product_variant_sizes_sku_unique_idx",
      "product_color_master_active_idx",
      "sync_products_baseline",
      "sync_product_categories_baseline",
      "sync_product_variants_baseline",
      "sync_product_variant_sizes_baseline",
      "Public can read active products",
      "Staff can manage products",
      "grant select on public.product_categories",
      "grant insert, update, delete on public.product_categories"
    ];

    for (const token of requiredBaselineTokens) {
      expect(baseline).toContain(token);
    }

    expect(baseline).toContain("unique (product_id, slug)");
    expect(baseline).toContain("unique (variant_id, image_role)");

    expect(baseline).toMatch(/create\s+table\s+if\s+not\s+exists\s+public\.page_heroes[\s\S]*status_aktif[\s\S]*status\s+text/iu);
    expect(baseline).toMatch(/create\s+table\s+if\s+not\s+exists\s+public\.cms_banners[\s\S]*experience_key[\s\S]*section_type[\s\S]*metadata\s+jsonb/iu);
    expect(baseline).toMatch(/create\s+table\s+if\s+not\s+exists\s+public\.product_color_master[\s\S]*color_hex\s+text\s+not\s+null[\s\S]*color_group\s+text[\s\S]*is_active\s+boolean/iu);
    expect(baseline).toContain("set_product_color_master_updated_at");
    expect(baseline).toContain('Public can read active color master');
    expect(baseline).toContain('Staff can manage color master');
    expect(baseline).toMatch(/create\s+table\s+if\s+not\s+exists\s+public\.product_subcategories[\s\S]*unique\s+\(category_id,\s*slug\)/iu);
    expect(baseline).toMatch(/create\s+table\s+if\s+not\s+exists\s+public\.product_size_guides[\s\S]*product_id\s+uuid/iu);
    expect(baseline).toMatch(/create\s+table\s+if\s+not\s+exists\s+public\.products[\s\S]*product_type\s+text[\s\S]*pricing_mode\s+text[\s\S]*uses_configurator\s+boolean[\s\S]*minimum_order_qty\s+integer/iu);
    expect(baseline).toContain('products_pricing_mode_check');
    expect(baseline).toContain("create index if not exists cms_banners_order_idx");
    expect(baseline).toContain("create index if not exists cms_banners_status_publish_idx");
    expect(baseline).toContain('Public can read published CMS banners');
    expect(baseline).toContain('Staff can manage CMS banners');

    expect(ledger).toContain("Tables");
    expect(ledger).toContain("Columns");
    expect(ledger).toContain("Enums");
    expect(ledger).toContain("Indexes");
    expect(ledger).toContain("Constraints/FKs");
    expect(ledger).toContain("Triggers/functions");
    expect(ledger).toContain("RLS/policies/grants");
  });

  it("provides configured order-line snapshot fields before instant-custom consumers", () => {
    const orderItemsStart = baseline.indexOf("create table if not exists public.order_items");
    const orderItemsEnd = baseline.indexOf("create table if not exists public.order_item_services");
    const orderItems = baseline.slice(orderItemsStart, orderItemsEnd);

    expect(orderItems).toContain("product_type text not null default 'standard_product'");
    expect(orderItems).toContain("config_snapshot jsonb not null default '{}'::jsonb");
    expect(orderItems).toContain("required_services jsonb not null default '[]'::jsonb");
    expect(orderItems).toContain("estimated_total numeric");
    expect(orderItems).toContain("order_items_required_services_array_check");
    expect(orderItems).toContain("order_items_config_snapshot_object_check");
  });

  it("accounts for the fresh inventory matrix foundation without cohort seed data", () => {
    for (const functionName of [
      "ensure_active_inventory_balance_matrix_v1",
      "ensure_sellable_inventory_balance_matrix_trigger_v1",
      "ensure_variant_inventory_balance_matrix_trigger_v1",
      "ensure_product_inventory_balance_matrix_trigger_v1",
      "ensure_location_inventory_balance_matrix_trigger_v1"
    ]) {
      expect(baseline).toContain(`public.${functionName}`);
    }
    expect(baseline).toContain("set search_path = ''");
    expect(baseline).toContain("from public, anon, authenticated");
    expect(baseline).not.toContain("P15 zero-balance cohort drift");
  });

  it("uses the Supabase pgcrypto schema explicitly", () => {
    expect(baseline).toMatch(/create\s+extension\s+if\s+not\s+exists\s+pgcrypto\s+with\s+schema\s+extensions\s*;/iu);
    expect(baseline).toMatch(/extensions\.gen_random_bytes\(24\)/u);
    expect(baseline).toMatch(/extensions\.gen_random_bytes\(6\)/u);
    expect(baseline).toMatch(/extensions\.gen_random_bytes\(32\)/u);
    expect(baseline).toMatch(/extensions\.digest\(raw_token,\s*'sha256'\)/u);
    expect(baseline).toMatch(/extensions\.digest\(coalesce\(p_token,\s*''\),\s*'sha256'\)/u);
    expect(baseline).not.toMatch(/(?<![\w.])(?:gen_random_bytes|digest|hmac|crypt|gen_salt)\s*\(/iu);
    expect(baseline).not.toMatch(/create\s+(?:or\s+replace\s+)?function\s+public\.gen_random_bytes\b/iu);
  });

  it("provides the canonical token-scoped mockup decision RPC before ACL reachability", () => {
    expect(baseline).toContain(
      "create or replace function public.submit_mockup_part_decision("
    );
    expect(baseline).toContain("p_token text");
    expect(baseline).toContain("p_mockup_part_id uuid");
    expect(baseline).toContain("returns jsonb");
    expect(baseline).toContain("set search_path = ''");
    expect(baseline).toContain("extensions.digest(coalesce(p_token, ''), 'sha256')");
    expect(baseline).toContain("mp.mockup_set_id = link_row.mockup_set_id");
    expect(baseline).toContain("mockup_approval_history");
    expect(baseline).toContain(
      "revoke all on function public.submit_mockup_part_decision(text, uuid, text, text) from public, authenticated"
    );
    expect(baseline).toContain(
      "grant execute on function public.submit_mockup_part_decision(text, uuid, text, text) to anon, authenticated"
    );
  });

  it("keeps the immediate executable replay pgcrypto contract schema-qualified", () => {
    const immediateFiles = [
      "20260711010000_v1_1_bulk_custom_ordering.sql",
      "20260711154141_v1_1_bulk_custom_ordering_compatibility.sql"
    ];

    for (const fileName of immediateFiles) {
      const sql = readFileSync(`${migrationsPath}/${fileName}`, "utf8");
      expect(sql, fileName).not.toMatch(/(?<![\w.])gen_random_bytes\s*\(/iu);
      expect(sql, fileName).toMatch(/extensions\.gen_random_bytes\(/u);
    }

    const knownDigestCorrections = [
      "20260714103000_commerce_foundation_v1_p0_whatsapp_digest_schema.sql",
      "20260720034655_fix_order_handoff_digest_schema_qualification.sql"
    ];
    for (const fileName of knownDigestCorrections) {
      const sql = readFileSync(`${migrationsPath}/${fileName}`, "utf8");
      expect(sql, fileName).toMatch(/extensions\.digest\(/u);
    }
  });

  it("contains no direct business, customer, or fixture seed rows", () => {
    const ddlOnly = withoutDollarBodies(baseline);
    expect(ddlOnly).not.toMatch(/\binsert\s+into\s+public\.(?:customers|customer_profiles|orders|order_items|order_payments|quotations|quotation_items|products|product_variants|product_variant_sizes|stores|profiles)\b/iu);
    expect(ddlOnly).not.toMatch(/\binsert\s+into\s+(?:auth\.users|storage\.objects|storage\.buckets)\b/iu);
    expect(ddlOnly).toMatch(/insert\s+into\s+public\.permission_definitions/iu);
    expect(ddlOnly).not.toMatch(/E2E_|@example\./iu);
  });
});

describe("static replay and security validation", () => {
  it("has no duplicate baseline tables, indexes, triggers, or policies", () => {
    const tableNames = uniqueMatches(baseline, /create\s+table\s+if\s+not\s+exists\s+public\.([a-z0-9_]+)/gimu);
    const indexNames = uniqueMatches(baseline, /create\s+(?:unique\s+)?index\s+if\s+not\s+exists\s+([a-z0-9_]+)/gimu);
    const triggerNames = uniqueMatches(baseline, /create\s+trigger\s+([a-z0-9_]+)/gimu);
    const policyNames = uniqueMatches(baseline, /create\s+policy\s+"([^"]+)"/gimu);

    expect(new Set(tableNames).size).toBe(tableNames.length);
    expect(new Set(indexNames).size).toBe(indexNames.length);
    expect(new Set(triggerNames).size).toBe(triggerNames.length);
    expect(new Set(policyNames).size).toBe(policyNames.length);
  });

  it("rejects non-idempotent table or index creator collisions in the executable manifest", () => {
    const executableFiles = [
      baselineName,
      ...manifestEntries
        .filter((entry) => ["RUN", "REORDER", "COMPATIBILITY"].includes(entry.classification))
        .map((entry) => entry.name)
    ];
    const definitions = new Map<string, { file: string; idempotent: boolean }>();

    for (const fileName of executableFiles) {
      const sql = fileName === baselineName
        ? baseline
        : readFileSync(`${migrationsPath}/${fileName}`, "utf8");
      const patterns = [
        /^(?:\s*)create\s+table\s+(if\s+not\s+exists\s+)?public\.([a-z0-9_]+)/gimu,
        /^(?:\s*)create\s+(?:unique\s+)?index\s+(if\s+not\s+exists\s+)?([a-z0-9_]+)/gimu
      ];

      for (const pattern of patterns) {
        for (const match of sql.matchAll(pattern)) {
          const kind = pattern.source.includes("table") ? "table" : "index";
          const key = `${kind}:${match[2].toLowerCase()}`;
          const current = { file: fileName, idempotent: Boolean(match[1]) };
          const prior = definitions.get(key);
          if (prior) {
            expect(
              current.idempotent && prior.idempotent,
              `${key} has a non-idempotent duplicate: ${prior.file} / ${current.file}`
            ).toBe(true);
          } else {
            definitions.set(key, current);
          }
        }
      }
    }
  });

  it("enables RLS for every baseline public table and validates FK targets", () => {
    const tableNames = uniqueMatches(baseline, /create\s+table\s+if\s+not\s+exists\s+public\.([a-z0-9_]+)/gimu);
    for (const tableName of tableNames) {
      expect(baseline.toLowerCase()).toContain(`alter table public.${tableName} enable row level security`);
    }

    const internalTargets = new Set(tableNames);
    const references = uniqueMatches(baseline, /references\s+public\.([a-z0-9_]+)/gimu);
    for (const target of references) {
      expect(internalTargets.has(target)).toBe(true);
    }
  });

  it("keeps security-definer functions on an explicit safe search path", () => {
    const securityDefinerBlocks = baseline.split(/create\s+or\s+replace\s+function/iu).slice(1);
    expect(securityDefinerBlocks.length).toBeGreaterThan(0);
    for (const block of securityDefinerBlocks) {
      const codeOnlyBlock = block.replace(/--[^\r\n]*/gu, "");
      if (/security\s+definer/iu.test(codeOnlyBlock)) {
        expect(codeOnlyBlock).toMatch(/set\s+search_path\s*=\s*(?:''|public)/iu);
      }
    }
    expect(baseline).toMatch(/revoke\s+all\s+on\s+function\s+public\.build_quotation_snapshot\(uuid\)\s+from\s+public,\s+anon,\s+authenticated,\s+service_role/iu);
    expect(baseline).not.toMatch(/grant\s+execute\s+on\s+function\s+public\.build_quotation_snapshot\(uuid\)\s+to\s+(?:public|anon|service_role)/iu);
    expect(baseline).toMatch(/revoke\s+all\s+on\s+function\s+public\.emit_notification_event\([^;]+\)\s+from\s+public,\s+anon,\s+authenticated,\s+service_role/iu);
    expect(baseline).toMatch(/revoke\s+all\s+on\s+function\s+public\.write_audit_log\([^;]+\)\s+from\s+public,\s+anon,\s+authenticated,\s+service_role/iu);
  });

  it("keeps compatibility directionality and Wave 0C reachability explicit", () => {
    expect(baseline).toContain("product_size_master.product_size_id is a one-way");
    expect(baseline).toContain("normalize_order_status");
    expect(baseline).toContain("new.status := public.normalize_order_status(new.status)");
    const wave0cPosition = manifest.indexOf("20260815212358_wave_0c_quotation_snapshot_security.sql");
    const baselinePosition = manifest.indexOf(baselineName);
    expect(baselinePosition).toBeGreaterThanOrEqual(0);
    expect(wave0cPosition).toBeGreaterThan(baselinePosition);
  });
});
