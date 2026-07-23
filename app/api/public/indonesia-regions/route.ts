import { getAdminSupabaseClient } from "@/lib/supabase/admin";
import type { IndonesiaRegionLevel } from "@/lib/indonesia-address";

const LEVELS = new Set<IndonesiaRegionLevel>(["province", "regency", "district", "village"]);
const REGION_CODE = /^[0-9A-Za-z.-]{1,24}$/;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const level = url.searchParams.get("level") as IndonesiaRegionLevel | null;
  const parentCode = url.searchParams.get("parent_code")?.trim() ?? "";
  if (!level || !LEVELS.has(level)) return response({ error: "Tingkat wilayah tidak valid." }, 400);
  if (level !== "province" && !REGION_CODE.test(parentCode)) return response({ error: "Induk wilayah tidak valid." }, 400);

  const client = getAdminSupabaseClient();
  if (!client) return response({ error: "Katalog wilayah belum tersedia." }, 503);
  let query = client.from("indonesia_regions")
    .select("code,name,postal_codes")
    .eq("level", level)
    .eq("is_active", true)
    .order("name")
    .limit(1000);
  query = level === "province" ? query.is("parent_code", null) : query.eq("parent_code", parentCode);
  const { data, error } = await query;
  if (error) return response({ error: "Katalog wilayah belum tersedia." }, 503);
  return response({ regions: (data ?? []).map((row) => ({ code: row.code, name: row.name, postalCodes: row.postal_codes ?? [] })) }, 200);
}

function response(body: Record<string, unknown>, status: number) {
  return Response.json(body, { status, headers: { "cache-control": status === 200 ? "public, max-age=300, stale-while-revalidate=3600" : "no-store" } });
}
