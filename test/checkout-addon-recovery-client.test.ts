import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as React from "react";
import { CheckoutClient } from "@/components/checkout/CheckoutClient";

// Minimal hook harness to exercise the real submit/reload handlers without a
// browser, network, or a new rendering dependency. This is not a visual UI test.
const harness = vi.hoisted(() => ({
  cursor: 0, draft: { current: null as unknown }, effects: [] as Array<() => unknown>,
  replace: vi.fn(), push: vi.fn(), clearCart: vi.fn(), revalidate: vi.fn()
}));
vi.mock("react", async (original) => ({
  ...await original<typeof import("react")>(),
  useState: (initial: unknown) => {
    const index = harness.cursor++;
    return [index === 2 ? false : initial, vi.fn()];
  },
  useRef: () => harness.draft,
  useMemo: (factory: () => unknown) => factory(),
  useEffect: (effect: () => unknown) => { harness.effects.push(effect); }
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: harness.replace, push: harness.push }) }));
const line = { lineType: "ready_stock", variantSizeId: "local-variant", quantity: 1, name: "Local test", priceValue: 100 };
vi.mock("@/components/CartProvider", () => ({
  isCustomProjectCartItem: () => false,
  useCart: () => ({ isLoaded: true, items: [line], checkoutDecision: { allowed: true, mode: "ready_stock" },
    revalidate: harness.revalidate, clearCart: harness.clearCart })
}));
vi.mock("@/components/customer-auth/CustomerAuthProvider", () => ({
  useCustomerAuth: () => ({ profile: null, accessToken: null })
}));
vi.mock("@/components/checkout/StructuredIndonesiaAddress", () => ({
  EMPTY_STRUCTURED_ADDRESS: {}, StructuredIndonesiaAddress: () => null
}));
vi.mock("@/lib/cart-v5", () => ({ cartItemSubtotal: () => 100 }));

type Submit = (event: { preventDefault: () => void; currentTarget: HTMLFormElement }) => Promise<void>;
function findSubmit(node: unknown): Submit | undefined {
  if (Array.isArray(node)) return node.map(findSubmit).find(Boolean);
  if (!node || typeof node !== "object") return;
  const element = node as { type?: string; props?: { children?: unknown; onSubmit?: Submit } };
  if (element.type === "form") return element.props?.onSubmit;
  return findSubmit(element.props?.children);
}

const storage = new Map<string, string>();
const recoveryKey = "debroder-checkout-recovery-v1";
const key = "local_legacy_checkout_123";
let fetchMock: ReturnType<typeof vi.fn>;
function render() {
  harness.cursor = 0;
  harness.effects = [];
  return CheckoutClient({ stores: [{ id: "local-store", name: "Local", address: "Local", hours: "Local" }] });
}
function storedDraft() { return JSON.parse(storage.get(recoveryKey)!); }

describe("ambiguous legacy/hash-conflict recovery keeps the original checkout key", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    harness.draft.current = null;
    storage.clear();
    storage.set(recoveryKey, JSON.stringify({ idempotencyKey: key, accessToken: "a".repeat(64), createdAt: new Date().toISOString() }));
    harness.revalidate.mockResolvedValue({ ok: true, lines: [line] });
    fetchMock = vi.fn();
    vi.stubGlobal("React", React);
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("sessionStorage", {
      getItem: (name: string) => storage.get(name) ?? null,
      setItem: (name: string, value: string) => storage.set(name, value),
      removeItem: (name: string) => storage.delete(name)
    });
    vi.stubGlobal("FormData", class { get() { return "local-value"; } });
  });
  afterEach(() => vi.unstubAllGlobals());

  it.each(["missing", "expired"])("does not rotate or resubmit when recovery is %s, including after reload/TTL", async (kind) => {
    fetchMock.mockImplementation(async (_url: string, options?: RequestInit) => options?.method === "POST"
      ? Response.json({ code: "CHECKOUT_IDEMPOTENCY_CONFLICT", preserveIdempotencyKey: true }, { status: 409 })
      : kind === "missing" ? Response.json({ found: false }) : Response.json({}, { status: 410 }));
    const submit = findSubmit(render())!;
    const event = { preventDefault: vi.fn(), currentTarget: {} as HTMLFormElement };
    await submit(event);
    expect(storedDraft()).toMatchObject({ idempotencyKey: key, integrityConflict: true });
    await submit(event);
    expect(fetchMock.mock.calls.filter(([, options]) => options?.method === "POST")).toHaveLength(1);
    expect(harness.clearCart).not.toHaveBeenCalled();

    storage.set(recoveryKey, JSON.stringify({ ...storedDraft(), createdAt: "2000-01-01T00:00:00Z" }));
    harness.draft.current = null;
    render();
    harness.effects[2](); // Mount-time recovery effect.
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4));
    expect(storedDraft()).toMatchObject({ idempotencyKey: key, integrityConflict: true });
    expect(harness.draft.current).toMatchObject({ idempotencyKey: key });
    expect(harness.replace).not.toHaveBeenCalled();
  });

  it("navigates to the saved legacy order after recovery without posting a new order or clearing the cart", async () => {
    storage.set(recoveryKey, JSON.stringify({ ...storedDraft(), integrityConflict: true }));
    fetchMock.mockResolvedValue(Response.json({ found: true, orderNumber: "LOCAL-ONLY-001", confirmationUrl: "/order-confirmation/local-token" }));
    const submit = findSubmit(render())!;
    await submit({ preventDefault: vi.fn(), currentTarget: {} as HTMLFormElement });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][1]).not.toHaveProperty("method", "POST");
    expect(harness.replace).toHaveBeenCalledWith("/order-confirmation/local-token");
    expect(harness.clearCart).not.toHaveBeenCalled();
    expect(storage.has(recoveryKey)).toBe(false);
  });
});
