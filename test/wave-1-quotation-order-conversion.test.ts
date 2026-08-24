import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migrationPath =
  "supabase/migrations/20260819141452_wave_1_quotation_order_conversion.sql";
const correctionMigrationPath =
  "supabase/migrations/20260819141725_wave_1_quotation_order_conversion_contract_correction.sql";
const serviceSnapshotCorrectionPath =
  "supabase/migrations/20260819144205_wave_1_quotation_order_service_snapshot.sql";
const serviceTriggerCorrectionPath =
  "supabase/migrations/20260819144405_wave_1_order_item_service_trigger_contract.sql";
const migration = existsSync(migrationPath)
  ? readFileSync(migrationPath, "utf8")
  : "";
const correctionMigration = existsSync(correctionMigrationPath)
  ? readFileSync(correctionMigrationPath, "utf8")
  : "";
const serviceSnapshotCorrection = existsSync(serviceSnapshotCorrectionPath)
  ? readFileSync(serviceSnapshotCorrectionPath, "utf8")
  : "";
const serviceTriggerCorrection = existsSync(serviceTriggerCorrectionPath)
  ? readFileSync(serviceTriggerCorrectionPath, "utf8")
  : "";
const conversionSource = readFileSync(
  "components/admin/OrderConversionManager.tsx",
  "utf8"
);

describe("Wave 1 quotation to order transaction contract", () => {
  it("has a native explicit-input conversion boundary", () => {
    expect(existsSync(migrationPath)).toBe(true);
    expect(migration).toContain(
      "create or replace function public.convert_quotation_to_order("
    );
    for (const parameter of [
      "p_customer_id",
      "p_customer_name",
      "p_customer_phone",
      "p_customer_email",
      "p_delivery_method",
      "p_pickup_location_id",
      "p_shipping_address",
      "p_payment_method",
      "p_shipping_cost",
      "p_resolved_price",
      "p_transaction_status",
      "p_idempotency_key"
    ]) {
      expect(migration).toContain(parameter);
    }
    expect(migration).toContain("security definer");
    expect(migration).toContain("set search_path = ''");
    expect(migration).toContain("public.has_permission('quotation.write')");
    expect(migration).toContain("public.has_permission('order.edit')");
  });

  it("guards delivery, price, version, customer, store, payment, and status inputs", () => {
    for (const contract of [
      "normalized_delivery not in ('pickup', 'shipping')",
      "p_pickup_location_id is null",
      "p_shipping_address",
      "p_shipping_cost is null",
      "p_resolved_price is null",
      "quotation_row.confirmed_total",
      "quotation_row.approved_version_id",
      "p_customer_name",
      "public.can_access_store(p_pickup_location_id)",
      "normalized_payment not in ('bank_transfer', 'pay_at_store')",
      "p_transaction_status",
      "quotation_row.status <> 'approved'"
    ]) {
      expect(migration).toContain(contract);
    }
  });

  it("serializes and deduplicates conversion without creating other commerce aggregates", () => {
    expect(migration).toContain("pg_advisory_xact_lock");
    expect(migration).toContain("for update");
    expect(migration).toContain(
      "create unique index if not exists orders_quotation_conversion_unique"
    );
    expect(migration).toContain("source_snapshot");
    expect(migration).toContain("idempotency_key");
    expect(migration).not.toMatch(/insert\s+into\s+public\.order_payments/i);
    expect(migration).not.toMatch(/insert\s+into\s+public\.stock_reservations/i);
    expect(migration).not.toMatch(/insert\s+into\s+public\.inventory_movements/i);
    expect(migration).not.toMatch(/insert\s+into\s+public\.fulfillments/i);
  });

  it("keeps the final order values inside the current active constraints", () => {
    expect(existsSync(correctionMigrationPath)).toBe(true);
    expect(correctionMigration).toContain("quotation_row.customer_id");
    expect(correctionMigration).toContain("$new$    null,");
    expect(correctionMigration).toContain("$new$    'locked',");
    expect(correctionMigration).toContain("regprocedure");
  });

  it("uses the canonical order-item service trigger contract exactly once", () => {
    expect(existsSync(serviceSnapshotCorrectionPath)).toBe(true);
    expect(serviceSnapshotCorrection).toContain("'service_id', qis.custom_service_id");
    expect(serviceSnapshotCorrection).toContain("'charged_quantity', qis.quantity");
    expect(serviceSnapshotCorrection).toContain("'pricing_type'");
    expect(serviceSnapshotCorrection).toContain("'total', qis.subtotal");
    expect(serviceSnapshotCorrection).toContain("insert into public.order_item_services");
    expect(serviceSnapshotCorrection).toContain("competing direct service insert");
  });

  it("keeps the existing service trigger aligned with order_item_services", () => {
    expect(existsSync(serviceTriggerCorrectionPath)).toBe(true);
    expect(serviceTriggerCorrection).toContain("custom_service_id");
    expect(serviceTriggerCorrection).toContain("service_name");
    expect(serviceTriggerCorrection).toContain("unit_price");
    expect(serviceTriggerCorrection).toContain("subtotal");
    expect(serviceTriggerCorrection).not.toContain("pricing_status,");
    expect(serviceTriggerCorrection).not.toContain("flat_price,");
    expect(serviceTriggerCorrection).toContain("snapshot->>'service_id'");
  });

  it("makes the admin control send every conversion input explicitly", () => {
    for (const field of [
      "deliveryMethod",
      "pickupLocationId",
      "shippingAddress",
      "shippingCost",
      "paymentMethod",
      "transactionStatus",
      "confirmCustomerIdentity"
    ]) {
      expect(conversionSource).toContain(field);
    }
    for (const parameter of [
      "p_customer_id",
      "p_customer_name",
      "p_delivery_method",
      "p_pickup_location_id",
      "p_shipping_address",
      "p_payment_method",
      "p_shipping_cost",
      "p_resolved_price",
      "p_transaction_status",
      "p_idempotency_key"
    ]) {
      expect(conversionSource).toContain(parameter);
    }
  });
});
