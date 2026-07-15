import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error: "Writer product-root PIM V2 sudah dipensiunkan. Gunakan /api/admin/products.",
      canonical_endpoint: "/api/admin/products"
    },
    { status: 410, headers: { "cache-control": "private, no-store" } }
  );
}
