import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  getProductManagerCapabilities,
  normalizeProductRootInput,
  validateProductPublishSnapshot
} from "@/lib/product-manager";

const navigation = readFileSync("components/admin/layout/admin-navigation.ts", "utf8");
const productRoute = readFileSync("app/api/admin/products/route.ts", "utf8");
const publicData = readFileSync("lib/public-data.ts", "utf8");
const migration = readFileSync(
  "supabase/migrations/20260715104222_pim_phase_1_product_lifecycle_consolidation.sql",
  "utf8"
).toLowerCase();

describe("PIM Phase 1 consolidation", () => {
  it("uses one Product Manager navigation entry and owner-only maintenance", () => {
    expect(navigation).toContain('label: "Product Manager", href: "/admin/products"');
    expect(navigation).toContain('label: "Maintenance PIM", href: "/admin/pim-manager"');
    expect(navigation).not.toContain('label: "PIM V2", href: "/admin/pim-v2"');
  });

  it("separates Admin draft capability from lifecycle capability", () => {
    expect(getProductManagerCapabilities("admin")).toMatchObject({
      canCreateDraft: true,
      canEditDraft: true,
      canPublish: false,
      canArchive: false,
      canUseMaintenance: false
    });
    expect(getProductManagerCapabilities("superadmin")).toMatchObject({
      canPublish: true,
      canArchive: true,
      canManageDependencies: true,
      canUseMaintenance: true
    });
  });

  it("normalizes canonical root fields", () => {
    expect(normalizeProductRootInput({
      name: "Kaos Cotton 24s",
      slug: "kaos-cotton-24s",
      productCategoryId: "11111111-1111-4111-8111-111111111111",
      basePrice: 45000
    })).toMatchObject({
      name: "Kaos Cotton 24s",
      slug: "kaos-cotton-24s",
      basePrice: 45000
    });
  });

  it("rejects Publish when variants, sellable SKU, size, or front image are missing", () => {
    const issues = validateProductPublishSnapshot({
      id: "product-1",
      name: "Kaos Cotton 24s",
      slug: "kaos-cotton-24s",
      productCategoryId: "category-1",
      basePrice: 45000,
      status: "draft",
      categoryActive: true,
      duplicateSlug: false,
      variants: [{
        id: "variant-1",
        name: "Black",
        status: "active",
        hasFrontImage: false,
        sellable: [{
          id: "size-1",
          sku: "",
          sizeId: null,
          sizeActive: false,
          stockQuantity: -1,
          status: "active",
          duplicateSku: false
        }]
      }]
    });
    expect(issues.map((issue) => issue.field)).toEqual(expect.arrayContaining([
      "variant.variant-1.images",
      "variant_size.size-1.sku",
      "variant_size.size-1.size_id",
      "variant_size.size-1.stock_quantity"
    ]));
  });

  it("accepts a valid Draft product tree", () => {
    expect(validateProductPublishSnapshot({
      id: "product-1",
      name: "Kaos Cotton 24s",
      slug: "kaos-cotton-24s",
      productCategoryId: "category-1",
      basePrice: 45000,
      status: "draft",
      categoryActive: true,
      duplicateSlug: false,
      variants: [{
        id: "variant-1",
        name: "Black",
        status: "active",
        hasFrontImage: true,
        sellable: [{
          id: "size-1",
          sku: "DBR-K24-BLK-M",
          sizeId: "size-master-1",
          sizeActive: true,
          stockQuantity: 12,
          status: "active",
          duplicateSku: false
        }]
      }]
    })).toEqual([]);
  });

  it("keeps lifecycle writes behind the canonical server route", () => {
    expect(productRoute).toContain('"save_draft"');
    expect(productRoute).toContain('"duplicate"');
    expect(productRoute).toContain('"publish"');
    expect(productRoute).toContain('"archive"');
    expect(productRoute).not.toContain('.delete(');
  });

  it("reads public products from canonical Active status", () => {
    expect(publicData).toContain('.eq("status", "active")');
    expect(publicData).not.toMatch(/from\("products"\)[\s\S]{0,120}eq\("status_aktif", true\)/);
  });

  it("keeps compatibility fields while enforcing lifecycle and parent-aware public RLS", () => {
    expect(migration).toContain("status set default 'draft'");
    expect(migration).toContain("status in ('draft', 'active', 'archived')");
    expect(migration).toContain("create or replace function public.sync_products_v1_compat");
    expect(migration).toContain("p.status = 'active'");
    expect(migration).not.toContain("delete from public.products");
    expect(migration).not.toContain("drop column");
  });
});
