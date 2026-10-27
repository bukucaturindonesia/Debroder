import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { PGlite } from "@electric-sql/pglite";

// Local catalog fixture only. This does not apply the candidate migration,
// reproduce canonical triggers, verify runtime RLS, or establish staging UAT.
const canonicalTables = [
  "orders", "order_payments", "order_tasks", "stock_reservations",
  "pickup_preparations", "fulfillments",
];
const fastTables = [
  "fast_checkout_settings", "fast_checkout_sessions",
  "fast_payment_attempts", "fast_checkout_rate_limits",
];
const fastFunctions = [
  "fast_checkout_preview_v1", "fast_checkout_create_v1", "fast_payment_claim_v1",
  "fast_payment_apply_v1", "fast_checkout_limit_v1", "fast_settings_update_v1",
  "fast_product_shipping_update_v1",
];
const countFixture = `
  select 'orders' as name, count(*)::integer as count from public.orders
  union all select 'order_payments', count(*)::integer from public.order_payments
  union all select 'order_tasks', count(*)::integer from public.order_tasks
  union all select 'stock_reservations', count(*)::integer from public.stock_reservations
  union all select 'pickup_preparations', count(*)::integer from public.pickup_preparations
  union all select 'fulfillments', count(*)::integer from public.fulfillments
  union all select 'products', count(*)::integer from public.products
  union all select 'migration_history', count(*)::integer from supabase_migrations.schema_migrations
  order by name;
`;
const countTables = `select n.nspname as schema_name, c.relname as table_name
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname in ('public', 'supabase_migrations') and c.relkind in ('r', 'p')
  order by n.nspname, c.relname;`;

test("read-only preflight SELECTs expose missing fast contracts without changing the local fixture", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create schema supabase_migrations;
      create table supabase_migrations.schema_migrations(version text primary key);
      ${[...canonicalTables, "products"].map((name) => `create table public.${name}(id integer primary key); alter table public.${name} enable row level security;`).join("\n")}
    `);
    const beforeRows = (await db.query(countFixture)).rows;
    const beforeTables = (await db.query(countTables)).rows;
    assert.equal(beforeRows.length, 8);
    assert.ok(beforeRows.every((row) => row.count === 0));
    assert.equal(beforeTables.length, 8);

    const script = readFileSync(new URL("../docs/auto-order/staging/READ_ONLY_PREFLIGHT.sql", import.meta.url), "utf8");
    // PostgreSQL enforces READ ONLY in this local transaction as well as the
    // before/after witnesses. No statement is sent to any remote database.
    await db.exec("begin read only;");
    const results = await db.exec(script);
    await db.exec("commit;");
    assert.equal(results.length, 5);

    const tableRows = results[0].rows;
    assert.equal(tableRows.length, 10);
    assert.deepEqual(tableRows.filter((row) => !row.present).map((row) => row.name).sort(), [...fastTables].sort());
    assert.deepEqual(tableRows.filter((row) => row.present).map((row) => row.name).sort(), [...canonicalTables].sort());

    const functionRows = results[1].rows;
    assert.equal(functionRows.length, 7);
    assert.deepEqual(functionRows.map((row) => row.name).sort(), [...fastFunctions].sort());
    assert.ok(functionRows.every((row) => Number(row.overload_count) === 0));
    assert.deepEqual(results[2].rows, [], "candidate migration must not appear installed");
    assert.deepEqual(results[3].rows, [], "fixture lacks candidate shipping/provider columns");

    const rlsRows = results[4].rows;
    assert.equal(rlsRows.length, 6);
    assert.deepEqual(rlsRows.map((row) => row.table_name).sort(), [...canonicalTables].sort());
    assert.ok(rlsRows.every((row) => row.rls_enabled === true));

    assert.deepEqual((await db.query(countFixture)).rows, beforeRows);
    assert.deepEqual((await db.query(countTables)).rows, beforeTables);
  } finally {
    await db.close();
  }
});
