import { NextResponse } from "next/server";
import { parseProductPayload } from "@/lib/product-parser";
import { validatePublishProduct } from "@/lib/product-validation";

export async function POST(request: Request) {
  const body: unknown = await request.json();
  const product = parseBodyProduct(body);

  if (!product) {
    return NextResponse.json(
      { error: "Invalid product payload.", issues: [] },
      { status: 400 }
    );
  }

  const issues = validatePublishProduct(product);
  return NextResponse.json({
    ok: !issues.some((issue) => issue.severity === "error"),
    issues
  });
}

function parseBodyProduct(value: unknown) {
  if (!isRecord(value)) {
    return null;
  }

  return parseProductPayload(value.product);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

