import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
const state = vi.hoisted(() => ({ client: vi.fn() }));
vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn }));
vi.mock("@/lib/supabase", () => ({ createSupabaseServerClient: state.client }));
import { getPublicContent } from "@/lib/public-data";
import { publishCmsNow, saveCmsDraft } from "@/lib/cms-workflow";

function client(banners: Record<string, unknown>[] = [], services: Record<string, unknown>[] = []) {
  return {
    from: (table: string) => {
      const rows = table === "cms_banners" ? banners : table === "services" ? services : [];
      const query: Record<string, unknown> = {};
      for (const method of ["select", "eq", "in", "or", "order", "limit", "range", "gte", "lte", "not", "is"])
        query[method] = () => query;
      query.maybeSingle = async () => ({ data: null, error: null });
      query.then = (resolve: (value: unknown) => unknown) => Promise.resolve({ data: rows, error: null }).then(resolve);
      return query;
    },
    rpc: async () => ({ data: [], error: null })
  };
}

describe("DTF CMS data isolation and existing workflow adapter", () => {
  beforeEach(() => vi.clearAllMocks());
  it("does not resurrect sample offers when CMS is unconfigured", async () => {
    state.client.mockReturnValue(null);
    expect((await getPublicContent()).dtfServices).toEqual([]);
  });
  it("keeps 17 verified originals out of landing and Jersey campaigns", async () => {
    const photos = Array.from({ length: 17 }, (_, i) => ({ id: `photo-${i}`, media_type: "image", desktop_media_url: `https://example.test/original-${i}.jpg`, section_group: "sablon-dtf", experience_key: "jersey", metadata: { debroder_original: true }, status: "published", is_active: true, sort_order: i }));
    state.client.mockReturnValue(client([...photos,
      { ...photos[0], id: "reference", metadata: {} },
      { ...photos[0], id: "video", media_type: "video" },
      { ...photos[0], id: "draft", status: "draft" },
      { ...photos[0], id: "inactive", is_active: false },
      { ...photos[0], id: "placeholder", desktop_media_url: "/images/debroder/placeholder.jpg" }
    ]));
    const content = await getPublicContent();
    expect(content.dtfSections).toHaveLength(17);
    expect(content.dtfSections?.[0].desktop_media_url).toBe(photos[0].desktop_media_url);
    expect(content.campaignBanners).toEqual([]);
    expect(content.jerseySections).toEqual([]);
    expect(content.dtfServices).toEqual([]);
  });
  it("carries placement and original confirmation through draft and publish RPC payloads", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { row: {} }, error: null });
    const cms = { rpc } as unknown as SupabaseClient;
    const payload = { section_group: "sablon-dtf", metadata: { debroder_original: true }, desktop_media_url: "https://example.test/original.jpg" };
    for (const action of [saveCmsDraft, publishCmsNow]) expect((await action(cms, "cms_banners", "00000000-0000-4000-8000-000000000001", payload)).success).toBe(true);
    expect(rpc).toHaveBeenCalledTimes(2);
    for (const [, args] of rpc.mock.calls) expect(args.p_data).toEqual(payload);
  });
});
