#!/usr/bin/env python3
"""Safe, narrowly scoped DEBRODER master size guide installer.
Usage: python tools/install_master_ukuran.py <path-to-Debroder-repo> --apply
Without --apply it only performs a dry-run/compatibility check.
"""
import argparse
from pathlib import Path
import sys

FILES = (
    "components/product/MasterKaosSizeGuide.tsx",
    "lib/master-kaos-size-guide.ts",
    "test/master-kaos-size-guide.test.ts",
    "public/images/size-guide/kaos-lengan-pendek.webp",
    "public/images/size-guide/kaos-lengan-panjang.webp",
)
TARGET = "components/TieredProductPurchasePanel.tsx"
IMPORT_ANCHOR = 'import type { ProductVariant } from "@/lib/types";'
IMPORT_ADDITION = 'import { MasterKaosSizeGuide } from "@/components/product/MasterKaosSizeGuide";\nimport { isKaosSizeGuideApplicable } from "@/lib/master-kaos-size-guide";'
FIELDSET_ANCHOR = '        </fieldset>\n\n        <section aria-labelledby="pdp-quantity-title">'
FIELDSET_ADDITION = '''          {isKaosSizeGuideApplicable(product.name, product.category, subcategory) ? (
            <div className="mt-3">
              <MasterKaosSizeGuide
                productName={product.name}
                category={product.category}
                subcategory={subcategory}
              />
            </div>
          ) : null}
        </fieldset>

        <section aria-labelledby="pdp-quantity-title">'''
HANDOFF_MARKER = "## DEBRODER MASTER PANDUAN UKURAN V1 — UI ONLY"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("repository", help="Local DEBRODER repo root (containing AGENTS.md)")
    parser.add_argument("--apply", action="store_true", help="Write files after all preconditions pass")
    opts = parser.parse_args()
    repo = Path(opts.repository).expanduser().resolve()
    src = Path(__file__).resolve().parents[1]
    if not (repo / "AGENTS.md").is_file() or not (repo / "app/produk/[slug]/page.tsx").is_file():
        print("BLOCKED: Path is not a DEBRODER repository root.", file=sys.stderr)
        return 2
    target = repo / TARGET
    if not target.is_file():
        print(f"BLOCKED: {TARGET} is missing.", file=sys.stderr)
        return 2
    old = target.read_text(encoding="utf-8")
    normalized = old.replace("\r\n", "\n")
    if IMPORT_ADDITION in normalized and FIELDSET_ADDITION in normalized:
        replacement = normalized
        print("Existing purchase-panel integration already applied.")
    elif IMPORT_ADDITION in normalized or FIELDSET_ADDITION in normalized:
        print("BLOCKED: Only some of the integration anchors exist; review manually.", file=sys.stderr)
        return 2
    else:
        if normalized.count(IMPORT_ANCHOR) != 1 or normalized.count(FIELDSET_ANCHOR) != 1:
            print("BLOCKED: Purchase-panel source drift; no files modified.", file=sys.stderr)
            return 2
        replacement = normalized.replace(IMPORT_ANCHOR, IMPORT_ANCHOR + "\n" + IMPORT_ADDITION, 1)
        replacement = replacement.replace(FIELDSET_ANCHOR, FIELDSET_ADDITION, 1)

    changes = []
    for rel in FILES:
        origin = src / rel
        output = repo / rel
        if not origin.is_file():
            print(f"BLOCKED: Package is incomplete: {rel}", file=sys.stderr)
            return 2
        content = origin.read_bytes()
        if output.exists() and output.read_bytes() != content:
            print(f"BLOCKED: Would overwrite a different existing file: {rel}", file=sys.stderr)
            return 2
        if not output.exists():
            changes.append((output, content, rel))
    if normalized != replacement:
        changes.append((target, replacement.encode("utf-8"), TARGET))

    print(f"Repository: {repo}")
    print("Scope: size-guide UI only, no checkout/DB/PIM mutation")
    for _, _, label in changes:
        print(("APPLY: " if opts.apply else "WOULD APPLY: ") + label)
    if not opts.apply:
        print("DRY RUN ONLY. Add --apply to install.")
        return 0

    for destination, content, _ in changes:
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes(content)
    handoff = repo / "CURRENT_PHASE_HANDOFF.md"
    if handoff.exists():
        current = handoff.read_text(encoding="utf-8")
        if HANDOFF_MARKER not in current:
            with handoff.open("a", encoding="utf-8") as f:
                f.write("\n\n" + HANDOFF_MARKER + "\n")
                f.write("- Owner reference: two master size-guide screenshots, short/long sleeve.\n")
                f.write("- Scope: product detail UI only, button next to size choices, native table and cropped original diagrams.\n")
                f.write("- Installation: local files applied by standalone script; no remote commit, push, deployment, migration or DB write.\n")
                f.write("- Tests/typecheck/lint/build: NOT RUN by installer; run separately on target repository.\n")
                f.write("- Status: IMPLEMENTED LOCALLY, production deployment NOT VERIFIED / NOT DONE.\n")
                f.write("- Next: pnpm test test/master-kaos-size-guide.test.ts && pnpm typecheck && pnpm exec eslint components/product/MasterKaosSizeGuide.tsx components/TieredProductPurchasePanel.tsx lib/master-kaos-size-guide.ts test/master-kaos-size-guide.test.ts && pnpm build.\n")
                f.write("- Resume: verify git diff, responsive modal focus/ESC/backdrop/tabs at widths 360/390/430/768/1280, and verify PIM-specific guide remains intact.\n")
    print("LOCAL INSTALL COMPLETE. No remote deployment was made.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
