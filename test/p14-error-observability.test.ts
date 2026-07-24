import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { redactObservabilityValue } from "@/lib/observability/redaction";
import {
  canonicalErrorResponse,
  createServerRequestContext,
  logServerError
} from "@/lib/observability/server";

const read = (path: string) => readFileSync(path, "utf8");

afterEach(() => {
  vi.restoreAllMocks();
});

describe("P14 canonical error handling and observability", () => {
  it("redacts nested transaction and customer secrets without mutating safe IDs", () => {
    const value = redactObservabilityValue({
      requestId: "request-123",
      entityId: "order-123",
      authorization: "Bearer private-token",
      customer: {
        customer_phone: "628123456789",
        shippingAddress: "Jalan Rahasia",
        email: "owner@example.com"
      },
      metadata: {
        note: "catatan privat",
        proof_path: "private/order/proof.pdf"
      },
      message: "Contact owner@example.com with Bearer abc.def.ghi"
    });
    expect(value).toMatchObject({
      requestId: "request-123",
      entityId: "order-123",
      authorization: "[REDACTED]",
      customer: {
        customer_phone: "[REDACTED]",
        shippingAddress: "[REDACTED]",
        email: "[REDACTED]"
      }
    });
    const serialized = JSON.stringify(value);
    expect(serialized).not.toContain("628123456789");
    expect(serialized).not.toContain("Jalan Rahasia");
    expect(serialized).not.toContain("owner@example.com");
    expect(serialized).not.toContain("abc.def.ghi");
    expect(serialized).not.toContain("private/order/proof.pdf");
  });

  it("propagates safe request/correlation IDs and excludes query secrets from routes", () => {
    const context = createServerRequestContext(
      new Request("https://debroder.example/api/checkout?token=secret", {
        headers: {
          "x-request-id": "req-123",
          "x-correlation-id": "corr-456"
        }
      }),
      "checkout creation"
    );
    expect(context).toMatchObject({
      requestId: "req-123",
      correlationId: "corr-456",
      route: "/api/checkout"
    });
    expect(JSON.stringify(context)).not.toContain("token=secret");
  });

  it("returns only canonical public details and writes one redacted structured log", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const context = createServerRequestContext(
      new Request("https://debroder.example/api/checkout", {
        headers: { "x-request-id": "req-error-1" }
      }),
      "checkout creation"
    );
    const error = Object.assign(
      new Error("customer owner@example.com token secret-token"),
      { code: "PGRST500" }
    );
    const response = canonicalErrorResponse({
      error,
      context,
      definition: {
        code: "CHECKOUT_UNAVAILABLE",
        message: "Checkout belum tersedia. Coba lagi.",
        status: 503
      },
      fields: {
        customerPhone: "628123456789",
        proofPath: "private/proof.pdf"
      }
    });
    const body = await response.json();
    expect(body).toMatchObject({
      code: "CHECKOUT_UNAVAILABLE",
      error: "Checkout belum tersedia. Coba lagi.",
      retryable: true
    });
    expect(response.headers.get("x-request-id")).toBe("req-error-1");
    expect(response.headers.get("x-correlation-id")).toBe("req-error-1");
    expect(JSON.stringify(body)).not.toContain("owner@example.com");
    expect(logged).toHaveBeenCalledTimes(1);
    const line = String(logged.mock.calls[0]?.[0]);
    expect(() => JSON.parse(line)).not.toThrow();
    expect(line).toContain('"event":"request.failed"');
    expect(line).not.toContain("owner@example.com");
    expect(line).not.toContain("628123456789");
    expect(line).not.toContain("private/proof.pdf");
  });

  it("deduplicates the same failure object at nested error boundaries", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const context = createServerRequestContext(null, "dedupe regression");
    const error = new Error("same failure");
    expect(logServerError(context, error, { event: "nested.failed" })).toBe(true);
    expect(logServerError(context, error, { event: "outer.failed" })).toBe(false);
    expect(console.error).toHaveBeenCalledTimes(1);
  });

  it("adopts the canonical boundary on critical routes without raw console logging", () => {
    const checkout = read("app/api/checkout/route.ts");
    const payment = read("app/api/public/payments/[token]/route.ts");
    const order = read("app/api/public/orders/[token]/route.ts");
    const tracking = read("app/api/public/order-tracking/route.ts");
    const orderAction = read("app/api/public/order-actions/route.ts");
    const publicError = read("lib/public-api-error.ts");
    const pageUseCase = read("lib/customer-orders/page-use-case.ts");

    for (const source of [
      checkout,
      payment,
      order,
      tracking,
      orderAction,
      publicError,
      pageUseCase
    ]) {
      expect(source).not.toMatch(/console\.(error|warn|info|log)/);
    }
    expect(checkout).toContain("p_request_id: observability.requestId");
    expect(checkout).toContain("observabilityResponseHeaders");
    expect(payment).toContain("public_payment.cleanup_failed");
    expect(payment).toContain("public_payment.active_stage_unavailable");
    expect(payment).toContain("if (payableOrderError) throw payableOrderError");
    expect(payment).toContain("if (methodError) throw methodError");
    expect(payment).toContain("if (existingError) throw existingError");
    expect(orderAction).toContain("public_order_action.audit_write_failed");
    expect(orderAction).toContain("public_order_action.rate_limit_unavailable");
    expect(tracking).toContain("customer_order_tracking.audit_write_failed");
    expect(tracking).toContain("observabilityResponseHeaders(observability)");
    expect(order).toContain("observabilityResponseHeaders(observability)");
    expect(publicError).toContain("canonicalErrorResponse");
    expect(read("app/error.tsx")).not.toContain("console.error");
  });

  it("never returns raw unknown Admin exception messages", () => {
    for (const path of [
      "lib/operations-auth.ts",
      "lib/payment-auth.ts",
      "lib/notification-auth.ts",
      "lib/phase13-auth.ts",
      "lib/repeat-order-auth.ts"
    ]) {
      const source = read(path);
      expect(source).toContain("canonicalErrorResponse");
      expect(source).not.toMatch(
        /\{\s*error:\s*error instanceof Error \? error\.message/
      );
    }
  });
});
