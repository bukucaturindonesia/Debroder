import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = path.join(
  process.cwd(),
  "supabase/migrations/20260718181000_indonesia_regions_province_regency_district_seed.sql",
);
const migration = fs.readFileSync(migrationPath, "utf8");

const canonicalRows = [
  ...migration.matchAll(
    /\('([^']+)', '(province|regency|district)', (null|'[^']+'), '([^']+)', '\{\}'::text\[\], true\)/g,
  ),
].map((match) => ({
  code: match[1],
  level: match[2],
  parentCode: match[3] === "null" ? null : match[3].slice(1, -1),
  name: match[4],
}));

describe("canonical Indonesian province/regency/district seed", () => {
  it("contains the structurally audited owner-supplied coverage", () => {
    const provinces = canonicalRows.filter((row) => row.level === "province");
    const regencies = canonicalRows.filter((row) => row.level === "regency");
    const districts = canonicalRows.filter((row) => row.level === "district");

    expect(provinces).toHaveLength(38);
    expect(regencies).toHaveLength(514);
    expect(districts).toHaveLength(7285);
    expect(new Set(canonicalRows.map((row) => row.code)).size).toBe(canonicalRows.length);
  });

  it("keeps every district attached to a seeded regency", () => {
    const regencyCodes = new Set(
      canonicalRows.filter((row) => row.level === "regency").map((row) => row.code),
    );
    const orphanDistricts = canonicalRows.filter(
      (row) => row.level === "district" && !regencyCodes.has(row.parentCode ?? ""),
    );

    expect(orphanDistricts).toEqual([]);
  });

  it("keeps every regency attached to a seeded province", () => {
    const provinceCodes = new Set(
      canonicalRows.filter((row) => row.level === "province").map((row) => row.code),
    );
    const orphanRegencies = canonicalRows.filter(
      (row) => row.level === "regency" && !provinceCodes.has(row.parentCode ?? ""),
    );

    expect(orphanRegencies).toEqual([]);
  });

  it("uses only the existing canonical table and preserves its security contract", () => {
    expect(migration).toContain("insert into public.indonesia_regions");
    expect(migration).not.toMatch(
      /create table if not exists public\.(provinces|regencies|districts)/i,
    );
    expect(migration).not.toMatch(/grant\s+select.*\b(anon|authenticated|public)\b/i);
    expect(migration).not.toMatch(/\b(delete|truncate)\s+from\b/i);
  });
});

