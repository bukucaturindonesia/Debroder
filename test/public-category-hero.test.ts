import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ client: vi.fn() }));
vi.mock("@/lib/supabase", () => ({ createSupabaseServerClient: mocks.client }));
vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn }));
import { getPublicCategoryHero } from "@/lib/public-category-hero";
import { publicCmsStatusFilter } from "@/lib/cms-workflow";

describe("public Custom hero CMS read", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-05T00:00:00Z"));
  });
  afterEach(() => vi.useRealTimers());

  it("reads only the selected active, publicly published CMS artwork", async () => {
    const artwork = { page_key: "custom", image_url: "/desktop.webp", mobile_image_url: "/mobile.webp" };
    const query = {
      select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: artwork, error: null })
    };
    const from = vi.fn().mockReturnValue(query);
    mocks.client.mockReturnValue({ from });
    expect(await getPublicCategoryHero("custom")).toEqual(artwork);
    expect(from).toHaveBeenCalledExactlyOnceWith("page_heroes");
    expect(query.eq).toHaveBeenCalledWith("page_key", "custom");
    expect(query.eq).toHaveBeenCalledWith("status_aktif", true);
    expect(query.or).toHaveBeenCalledWith(publicCmsStatusFilter());
    expect(query.select.mock.calls[0][0]).not.toContain("price");
  });

  it("returns no artwork when no environment is configured", async () => {
    mocks.client.mockReturnValue(null);
    expect(await getPublicCategoryHero("custom")).toBeNull();
  });

  it.each(["query-error", "network-error"])("degrades safely on %s", async (failure) => {
    const query = {
      select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(),
      maybeSingle: failure === "query-error"
        ? vi.fn().mockResolvedValue({ data: null, error: { message: "unavailable" } })
        : vi.fn().mockRejectedValue(new Error("unavailable"))
    };
    mocks.client.mockReturnValue({ from: vi.fn().mockReturnValue(query) });
    expect(await getPublicCategoryHero("custom")).toBeNull();
  });
});
