import { describe, expect, it } from "vitest";
import {
  defaultKaosSleeve,
  isKaosSizeGuideApplicable,
  MASTER_KAOS_SIZE_GUIDES,
  MASTER_KAOS_SIZE_TOLERANCE
} from "@/lib/master-kaos-size-guide";

describe("master kaos size guide — owner-approved reference", () => {
  it("matches every long-sleeve reference measurement, S–5XL", () => {
    expect(MASTER_KAOS_SIZE_GUIDES.long.rows.map((r) => [r.size, r.chest, r.length, r.sleeve])).toEqual([
      ["S", 47, 67, 58], ["M", 50, 70, 59], ["L", 53, 73, 60],
      ["XL", 56, 75, 61], ["2XL", 59, 77, 62], ["3XL", 62, 80, 63],
      ["4XL", 65, 83, 64], ["5XL", 68, 86, 65]
    ]);
  });

  it("matches every short-sleeve reference measurement, S–3XL", () => {
    expect(MASTER_KAOS_SIZE_GUIDES.short.rows.map((r) => [r.size, r.chest, r.length, r.sleeve])).toEqual([
      ["S", 47, 67, 19], ["M", 50, 70, 19.5], ["L", 53, 73, 20],
      ["XL", 56, 75, 20.5], ["2XL", 59, 77, 21], ["3XL", 62, 80, 21.5]
    ]);
  });

  it("uses the exact tolerance from the supplied screenshots", () => {
    expect(MASTER_KAOS_SIZE_TOLERANCE).toBe("Toleransi ukuran 1–2,5 cm");
  });

  it("excludes unrelated jersey, jacket and hoodie products", () => {
    expect(isKaosSizeGuideApplicable("Cotton Combed 24s", "Kaos Polos")).toBe(true);
    expect(isKaosSizeGuideApplicable("Jersey Futsal", "Jersey")).toBe(false);
    expect(isKaosSizeGuideApplicable("Hoodie Kaos Fleece", "Jaket & Hoodie")).toBe(false);
  });

  it("prefers long sleeves only for explicitly named long sleeve products", () => {
    expect(defaultKaosSleeve("Kaos Lengan Panjang")).toBe("long");
    expect(defaultKaosSleeve("Kaos Cotton Combed 24s")).toBe("short");
  });
});
