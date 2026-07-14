import { describe, expect, it } from "vitest";
import {
  catalogColumnsForWidth,
  initialCatalogBatch,
  nextCatalogBatch,
  uniqueCatalogProducts
} from "@/lib/product-catalog";
import { headwearTypeOptions, jacketTypeOptions, matchesProductType } from "@/lib/product-taxonomy";
import type { Product } from "@/lib/types";

function product(id: string, slug = id): Product {
  return {
    id,
    slug,
    nama: id,
    kategori: "Kaos Polos",
    deskripsi: "",
    badge: "",
    gambar_url: "",
    whatsapp_link: "",
    urutan: 0,
    status_aktif: true
  };
}

describe("product catalog batching", () => {
  it("uses four columns from the desktop breakpoint and two below it", () => {
    expect(catalogColumnsForWidth(1024)).toBe(4);
    expect(catalogColumnsForWidth(768)).toBe(2);
    expect(catalogColumnsForWidth(360)).toBe(2);
  });

  it("starts with two rows and adds exactly one row", () => {
    expect(initialCatalogBatch(4)).toBe(8);
    expect(initialCatalogBatch(2)).toBe(4);
    expect(nextCatalogBatch(8, 4, 13)).toBe(12);
    expect(nextCatalogBatch(4, 2, 5)).toBe(5);
  });

  it("removes duplicate PIM products without changing their order", () => {
    expect(uniqueCatalogProducts([product("a"), product("a"), product("b")]).map((item) => item.id)).toEqual(["a", "b"]);
  });

  it("matches category type filters only from actual PIM text", () => {
    const hoodie = { ...product("hoodie"), nama: "Zip Hoodie Fleece", material_tags: ["Fleece 280gsm"] };
    const cap = { ...product("cap"), nama: "Topi Trucker Cotton Twill", kategori: "Headwear" };

    expect(matchesProductType(hoodie, "zip-hooded", jacketTypeOptions)).toBe(true);
    expect(matchesProductType(cap, "trucker-cap", headwearTypeOptions)).toBe(true);
    expect(matchesProductType(cap, "bucket-hat", headwearTypeOptions)).toBe(false);
  });
});
