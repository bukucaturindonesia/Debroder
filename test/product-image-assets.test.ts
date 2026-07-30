import { createHash } from "node:crypto";
import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync
} from "node:fs";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { describe, expect, it } from "vitest";

type InventoryRecord = {
  sourcePath: string;
  byteSize: number;
  width: number;
  height: number;
  contentHash: string;
  duplicateState: string;
  duplicateOf: string | null;
  mappingConfidence: "high" | "ambiguous";
  destinationPath: string | null;
  publicUrl: string | null;
  activatedPrimary: boolean;
  accountingStatus: "copied_canonical" | "staged_ambiguous";
};

type ImageInventory = {
  sourceRoot: string;
  summary: {
    totalSourceFiles: number;
    validFiles: number;
    zeroByteFiles: number;
    corruptFiles: number;
    exactDuplicateGroups: number;
    exactDuplicateFiles: number;
    caseCollisions: number;
    sameNameDifferentContent: number;
    mappedAndCopied: number;
    stagedAmbiguous: number;
    activatedPrimaryImages: number;
  };
  primaryActivations: Array<{
    productSlug: string;
    productSku: string;
    sourcePath: string;
    publicUrl: string;
  }>;
  files: InventoryRecord[];
};

const repositoryRoot = resolve(".");
const inventory = JSON.parse(
  readFileSync(resolve(repositoryRoot, "data/product-image-inventory.json"), "utf8")
) as ImageInventory;
const migration = readFileSync(
  resolve(
    repositoryRoot,
    "supabase/migrations/20260728153142_canonical_trial_pricing_v1.sql"
  ),
  "utf8"
);

describe("owner product-image recovery", () => {
  it("accounts for every protected source asset without deleting or corrupting it", () => {
    expect(inventory.sourceRoot).toBe("public/product-images-source");
    expect(inventory.files).toHaveLength(101);
    expect(inventory.summary).toMatchObject({
      totalSourceFiles: 101,
      validFiles: 101,
      zeroByteFiles: 0,
      corruptFiles: 0,
      exactDuplicateGroups: 1,
      exactDuplicateFiles: 1,
      caseCollisions: 0,
      sameNameDifferentContent: 0
    });

    for (const asset of inventory.files) {
      const source = resolveRepositoryPath(asset.sourcePath);
      expect(existsWithExactCase(source), asset.sourcePath).toBe(true);
      expect(statSync(source).size, asset.sourcePath).toBe(asset.byteSize);
      expect(asset.byteSize, asset.sourcePath).toBeGreaterThan(0);
      expect(asset.width, asset.sourcePath).toBeGreaterThan(0);
      expect(asset.height, asset.sourcePath).toBeGreaterThan(0);

      const bytes = readFileSync(source);
      expect(bytes.subarray(0, 4).toString("ascii"), asset.sourcePath).toBe("RIFF");
      expect(bytes.subarray(8, 12).toString("ascii"), asset.sourcePath).toBe("WEBP");
      expect(sha256(bytes), asset.sourcePath).toBe(asset.contentHash);
    }
  });

  it("copies only high-confidence Crewneck assets to canonical public paths", () => {
    const copied = inventory.files.filter(
      (asset) => asset.accountingStatus === "copied_canonical"
    );
    const ambiguous = inventory.files.filter(
      (asset) => asset.accountingStatus === "staged_ambiguous"
    );

    expect(copied).toHaveLength(12);
    expect(ambiguous).toHaveLength(89);
    expect(inventory.summary).toMatchObject({
      mappedAndCopied: 12,
      stagedAmbiguous: 89
    });

    for (const asset of copied) {
      expect(asset.mappingConfidence).toBe("high");
      expect(asset.destinationPath).toMatch(
        /^public\/products\/crewneck\/[a-z0-9-]+\/front\.webp$/
      );
      expect(asset.publicUrl).toMatch(
        /^\/products\/crewneck\/[a-z0-9-]+\/front\.webp$/
      );
      expect(asset.publicUrl).not.toContain("/public/");
      expect(asset.publicUrl).not.toMatch(/[ ()]/);

      const destination = resolveRepositoryPath(asset.destinationPath!);
      expect(existsWithExactCase(destination), asset.destinationPath!).toBe(true);
      expect(sha256(readFileSync(destination)), asset.destinationPath!).toBe(
        asset.contentHash
      );
    }

    for (const asset of ambiguous) {
      expect(asset.mappingConfidence).toBe("ambiguous");
      expect(asset.destinationPath).toBeNull();
      expect(asset.publicUrl).toBeNull();
      expect(asset.activatedPrimary).toBe(false);
    }
  });

  it("activates one verified Crewneck primary and no ambiguous image", () => {
    const activated = inventory.files.filter((asset) => asset.activatedPrimary);

    expect(activated).toHaveLength(1);
    expect(inventory.primaryActivations).toEqual([{
      productSlug: "crewneck",
      productSku: "DBR-CREWNECK",
      sourcePath: "public/product-images-source/CREWNEK/118-Black.webp",
      publicUrl: "/products/crewneck/black/front.webp"
    }]);
    expect(migration).toContain(
      "image_url = '/products/crewneck/black/front.webp'"
    );
    expect(migration).toContain("upper(btrim(sku)) = 'DBR-CREWNECK'");
    expect(migration).toContain("'ambiguous_product_images_activated', 0");

    const ambiguousUrls = inventory.files
      .filter((asset) => asset.mappingConfidence === "ambiguous")
      .flatMap((asset) => asset.publicUrl ? [asset.publicUrl] : []);
    expect(ambiguousUrls).toEqual([]);
  });

  it("records the known byte-identical duplicate explicitly", () => {
    const duplicateHashes = new Map<string, InventoryRecord[]>();
    for (const asset of inventory.files) {
      const matches = duplicateHashes.get(asset.contentHash) ?? [];
      matches.push(asset);
      duplicateHashes.set(asset.contentHash, matches);
    }
    const groups = [...duplicateHashes.values()].filter(
      (assets) => assets.length > 1
    );

    expect(groups).toHaveLength(1);
    expect(groups[0].map((asset) => asset.sourcePath).sort()).toEqual([
      "public/product-images-source/HODDIE/103-Lilac (1).webp",
      "public/product-images-source/HODDIE/103-Lilac.webp"
    ]);
    expect(
      groups[0].filter((asset) => asset.duplicateState === "exact_duplicate")
    ).toHaveLength(1);
    expect(groups[0].some((asset) => asset.duplicateOf !== null)).toBe(true);
  });
});

function resolveRepositoryPath(path: string): string {
  const resolved = resolve(repositoryRoot, path);
  const relativePath = relative(repositoryRoot, resolved);
  if (
    isAbsolute(relativePath)
    || relativePath === ".."
    || relativePath.startsWith(`..${sep}`)
  ) {
    throw new Error(`Inventory path escapes repository root: ${path}`);
  }
  return resolved;
}

function existsWithExactCase(path: string): boolean {
  if (!existsSync(path)) return false;
  if (path === repositoryRoot) return true;

  const parent = dirname(path);
  if (parent === path || !existsWithExactCase(parent)) return false;
  const expectedName = path.slice(parent.length + 1);
  return readdirSync(parent).includes(expectedName);
}

function sha256(bytes: Buffer): string {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}
