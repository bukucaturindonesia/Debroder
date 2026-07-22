import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { getProductManagerCapabilities } from "@/lib/product-manager";
import {
  canManageProductVariants,
  emptyProductVariantForm,
  normalizeHex,
  normalizeProductColorType,
  normalizeProductSwatchDirection,
  sameProductVariantForm,
  sameSizeSelection,
  safePatternImageUrl
} from "@/lib/product-variants";
import { swatchStyle } from "@/components/admin/products/workspace/ProductColorSwatch";

const variantsPage = readFileSync("app/admin/products/[id]/variants/page.tsx", "utf8");
const variantsRoute = readFileSync("app/api/admin/products/[id]/variants/route.ts", "utf8");
const variantsPanel = readFileSync(
  "components/admin/products/workspace/ProductVariantsPanel.tsx",
  "utf8"
);
const swatchComponent = readFileSync(
  "components/admin/products/workspace/ProductColorSwatch.tsx",
  "utf8"
);

const solid = {
  colorType: "solid" as const,
  primaryHex: "#112233",
  secondaryHex: null,
  tertiaryHex: null,
  swatchDirection: "diagonal" as const,
  patternImageUrl: null,
  colorHex: "#000000"
};

const combination = {
  colorType: "combination" as const,
  primaryHex: "#111111",
  secondaryHex: "#FFFFFF",
  tertiaryHex: "#FF0000",
  swatchDirection: "diagonal" as const,
  patternImageUrl: null,
  colorHex: "#111111"
};

const pattern = {
  colorType: "pattern" as const,
  primaryHex: "#556B2F",
  secondaryHex: null,
  tertiaryHex: null,
  swatchDirection: "diagonal" as const,
  patternImageUrl: "https://example.com/pattern.webp",
  colorHex: "#556B2F"
};

describe("WP-04 Product Variants and Multi-color", () => {
  it("replaces the WP-02 read-only variants page with the split-panel module", () => {
    expect(variantsPage).toContain("ProductVariantsPanel");
    expect(variantsPage).not.toContain("ProductWorkspaceReadOnlyModule");
    expect(variantsPanel).toContain("Daftar warna");
    expect(variantsPanel).toContain("DETAIL WARNA TERPILIH");
    expect(variantsPanel).toContain("UKURAN TERSEDIA PER WARNA");
    expect(variantsPanel).toContain("satu warna pada satu waktu");
  });

  it("loads only one product variants tree through a module-specific endpoint", () => {
    expect(variantsRoute).toContain("export async function GET");
    expect(variantsRoute).toContain("export async function PATCH");
    expect(variantsRoute).not.toContain("export async function POST");
    expect(variantsRoute).not.toContain("export async function PUT");
    expect(variantsRoute).not.toContain("export async function DELETE");
    expect(variantsRoute).toContain('.eq("product_id", productId)');
    expect(variantsRoute).toContain('.from("product_variants")');
    expect(variantsRoute).toContain('.from("product_variant_sizes")');
    expect(variantsRoute).toContain('.from("product_color_master")');
    expect(variantsRoute).toContain('.from("product_size_master")');
    expect(variantsRoute).not.toContain('.from("inventory_balances")');
    expect(variantsRoute).not.toContain('.from("inventory_locations")');
  });

  it("implements the complete frozen multi-color contract", () => {
    for (const field of [
      "color_type",
      "primary_hex",
      "secondary_hex",
      "tertiary_hex",
      "swatch_direction",
      "pattern_image_url",
      "color_hex"
    ]) {
      expect(variantsRoute).toContain(field);
    }
    expect(swatchComponent).toContain("linear-gradient");
    expect(swatchComponent).toContain("backgroundImage");
    expect(swatchStyle(solid)).toMatchObject({ backgroundColor: "#112233" });
    expect(String(swatchStyle(combination).backgroundImage)).toContain("#FFFFFF");
    expect(String(swatchStyle(combination).backgroundImage)).toContain("#FF0000");
    expect(String(swatchStyle(pattern).backgroundImage)).toContain("pattern.webp");
  });

  it("supports different active sizes per color without opening WP-05 stock editing", () => {
    expect(variantsPanel).toContain("UKURAN TERSEDIA PER WARNA");
    expect(variantsPanel).toContain("Menonaktifkan ukuran tidak menghapus SKU historis");
    expect(variantsPanel).toContain("Harga dan stok tetap dikelola pada WP-05");
    expect(variantsPanel).toContain("Simpan Ukuran Tersedia");
    expect(variantsRoute).toContain("buildDeterministicSku");
    expect(variantsRoute).toContain("stock_quantity: 0");
    expect(variantsRoute).toContain("price_adjustment: 0");
    expect(variantsRoute).toContain('status: "inactive"');
    expect(variantsRoute).not.toContain(".delete(");
    expect(variantsPanel).not.toContain('label="Stok"');
    expect(variantsPanel).not.toContain('label="Penyesuaian harga"');
  });

  it("keeps default color, status, ordering, list summaries, and front completeness visible", () => {
    expect(variantsPanel).toContain("Jadikan warna default");
    expect(variantsPanel).toContain("Aktif");
    expect(variantsPanel).toContain("Nonaktif");
    expect(variantsPanel).toContain("Urutan");
    expect(variantsPanel).toContain("ukuran aktif");
    expect(variantsPanel).toContain("SKU aktif");
    expect(variantsPanel).toContain("Front lengkap");
    expect(variantsRoute).toContain("is_default");
    expect(variantsRoute).toContain("frontImageComplete");
  });

  it("enforces frozen role parity for dependency mutation", () => {
    expect(canManageProductVariants(getProductManagerCapabilities("admin_guest"))).toBe(false);
    expect(canManageProductVariants(getProductManagerCapabilities("admin"))).toBe(false);
    expect(canManageProductVariants(getProductManagerCapabilities("owner"))).toBe(true);
    expect(canManageProductVariants(getProductManagerCapabilities("superadmin"))).toBe(true);
    expect(canManageProductVariants(getProductManagerCapabilities("super_admin"))).toBe(true);
    expect(variantsRoute).toContain("canManageDependencies");
    expect(variantsRoute).toContain("Owner atau Super Admin");
    expect(variantsPanel).toContain("MODE LIHAT SAJA");
  });

  it("prevents silent overwrite with variant and row-level expected versions", () => {
    expect(variantsRoute).toContain("expectedUpdatedAt");
    expect(variantsRoute).toContain("expectedDefaultUpdatedAt");
    expect(variantsRoute).toContain("expectedVariantUpdatedAt");
    expect(variantsRoute).toContain("expectedRowVersions");
    expect(variantsRoute).toContain('.eq("updated_at", expected)');
    expect(variantsRoute).toContain("409");
    expect(variantsRoute).toContain("Muat ulang data terbaru");
    expect(variantsPanel).toContain("Konflik versi");
  });

  it("implements every editable-module save state and dirty navigation decision", () => {
    for (const state of ["clean", "dirty", "saving", "saved", "conflict", "error"]) {
      expect(variantsPanel).toContain(state);
    }
    expect(variantsPanel).toContain("Simpan perubahan sebelum keluar?");
    expect(variantsPanel).toContain("Keluar tanpa menyimpan");
    expect(variantsPanel).toContain("Tetap di sini");
    expect(variantsPanel).toContain("beforeunload");
  });

  it("preserves no-hard-delete and existing-master identity", () => {
    expect(variantsRoute).not.toContain(".delete(");
    expect(variantsRoute).toContain("Master warna pada varian existing tidak boleh diganti");
    expect(variantsRoute).toContain("histori SKU tetap aman");
    expect(variantsRoute).toContain("Nonaktifkan seluruh ukuran");
    expect(variantsRoute).toContain("PRODUCT_COLOR_CREATED");
    expect(variantsRoute).toContain("PRODUCT_COLOR_STATUS_CHANGED");
    expect(variantsRoute).toContain("VARIANT_SIZE_CHANGED");
  });

  it("keeps form and size dirty comparisons deterministic", () => {
    const form = emptyProductVariantForm({ firstVariant: true, sortOrder: 0 });
    expect(sameProductVariantForm(form, { ...form })).toBe(true);
    expect(sameProductVariantForm(form, { ...form, sortOrder: 1 })).toBe(false);
    expect(sameSizeSelection(["M", "L"], ["L", "M", "M"])).toBe(true);
    expect(sameSizeSelection(["M"], ["L"])).toBe(false);
    expect(normalizeProductColorType("combination")).toBe("combination");
    expect(normalizeProductColorType("unknown")).toBe("solid");
    expect(normalizeProductSwatchDirection("vertical")).toBe("vertical");
    expect(normalizeHex("#aabbcc")).toBe("#AABBCC");
    expect(safePatternImageUrl("javascript:alert(1)")).toBeNull();
  });

  it("does not introduce schema, RLS, inventory, media, or lifecycle expansion", () => {
    const lower = variantsRoute.toLowerCase();
    expect(lower).not.toContain("create table");
    expect(lower).not.toContain("alter table");
    expect(variantsRoute).not.toContain("service_role");
    expect(variantsRoute).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(variantsRoute).not.toContain("Publish");
    expect(variantsRoute).not.toContain("Archive");
    expect(variantsPanel).not.toContain("Upload");
  });
});
