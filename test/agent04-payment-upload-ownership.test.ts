import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ client: null as unknown }));
vi.mock("@/lib/supabase/admin", () => ({ getAdminSupabaseClient: () => mocks.client }));
vi.mock("@/lib/payment-token", () => ({ hashPaymentToken: () => "local-test-token-hash" }));
vi.mock("@/lib/observability/server", () => ({
  createServerRequestContext: () => ({}), logServerError: vi.fn(), logServerEvent: vi.fn(),
  observabilityResponseHeaders: () => ({})
}));
vi.mock("@/lib/public-api-error", () => ({
  publicApiErrorResponse: (_error: unknown, _scope: unknown, options: { status: number }) =>
    Response.json({ error: "mocked safe error" }, { status: options.status })
}));
import { POST } from "../app/api/public/payments/[token]/route";

function request() {
  const form = new FormData();
  Object.entries({ amount: "100", paidAt: "2026-01-01", paymentMethodId: "11111111-1111-1111-1111-111111111111", channelName: "LOCAL QA", senderName: "Synthetic QA", idempotencyKey: "agent04_same_key_001" }).forEach(([key, value]) => form.set(key, value));
  form.set("proof", new File([new Uint8Array([137,80,78,71,13,10,26,10])], "synthetic.png", { type: "image/png" }));
  return new Request("http://localhost/api/public/payments/local", { method: "POST", body: form });
}
const context = () => ({ params: Promise.resolve({ token: "local-only" }) });
function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
}
function harness(rpcFails = false, existingPayment = false) {
  const objects = new Set<string>();
  const rpcEntered = deferred();
  const releaseRpc = deferred();
  const upload = vi.fn(async (path: string) => {
    if (objects.has(path)) return { error: { message: "already exists" } };
    objects.add(path);
    return { error: null };
  });
  const remove = vi.fn(async (paths: string[]) => {
    paths.forEach((path) => objects.delete(path));
    return { error: null };
  });
  const rpc = vi.fn(async () => {
    rpcEntered.resolve();
    if (!rpcFails) await releaseRpc.promise;
    return rpcFails ? { data: null, error: { message: "local simulated RPC failure" } } : { data: { payment_number: "QA-PAY-1" }, error: null };
  });
  const from = (table: string) => {
    const result = table === "payment_submission_links" ? { id: "link-local", order_id: "order-local", expires_at: "2099-01-01", used_count: 0, max_uses: 100 } : table === "orders" ? { pricing_status: "final", total_amount: 100 } : table === "payment_method_settings" ? { id: "method-local" } : table === "order_payments" && existingPayment ? { payment_number: "QA-PAY-1", status: "pending", order_id: "order-local", submission_link_id: "link-local" } : null;
    const chain = { select: () => chain, eq: () => chain, is: () => chain, maybeSingle: async () => ({ data: result, error: null }) };
    return chain;
  };
  mocks.client = { from, rpc, storage: { from: () => ({ upload, remove }) } };
  return { objects, upload, remove, rpc, rpcEntered, releaseRpc };
}
beforeEach(() => vi.clearAllMocks());
it("conflicting concurrent loser preserves winner proof while winner RPC is in flight", async () => {
  const h = harness();
  const winner = POST(request(), context());
  await h.rpcEntered.promise;
  const loser = await POST(request(), context());
  h.releaseRpc.resolve();
  const success = await winner;
  expect(success.status).toBe(201);
  expect(loser.status).toBe(400);
  expect(h.upload).toHaveBeenCalledTimes(2);
  expect(h.rpc).toHaveBeenCalledTimes(1);
  expect(h.remove).not.toHaveBeenCalled();
  expect(h.objects.has("public/order-local/agent04_same_key_001.png")).toBe(true);
});
it("cleans the request-owned uploaded object when subsequent RPC fails", async () => {
  const h = harness(true);
  const result = await POST(request(), context());
  expect(result.status).toBe(400);
  expect(h.remove).toHaveBeenCalledWith(["public/order-local/agent04_same_key_001.png"]);
  expect(h.objects.size).toBe(0);
});

it("returns the existing payment on retry without another upload or RPC", async () => {
  const h = harness(false, true);
  const result = await POST(request(), context());
  expect(result.status).toBe(200);
  expect(await result.json()).toEqual({ paymentNumber: "QA-PAY-1", status: "pending", idempotent: true });
  expect(h.upload).not.toHaveBeenCalled();
  expect(h.rpc).not.toHaveBeenCalled();
  expect(h.remove).not.toHaveBeenCalled();
});
