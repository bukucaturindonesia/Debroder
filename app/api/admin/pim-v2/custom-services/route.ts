import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import type { CustomService, ServicePricingType, ValidationIssue } from "@/lib/types";
import { getAdminSupabaseClient } from "@/lib/supabase/client";

export async function POST(request: Request) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized.", issues: [] }, { status: 401 });
  }

  const body: unknown = await request.json();
  const services = parseServicesPayload(body);

  if (!services) {
    return NextResponse.json(
      { error: "Invalid service catalog payload.", issues: [] },
      { status: 400 }
    );
  }

  const issues = validateServices(services);
  if (issues.some((issue) => issue.severity === "error")) {
    return NextResponse.json(
      { error: "Validation failed.", issues },
      { status: 422 }
    );
  }

  const client = getAdminSupabaseClient();
  if (!client) {
    return NextResponse.json(
      {
        error:
          "Supabase admin environment is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
        issues: []
      },
      { status: 503 }
    );
  }

  for (const service of services) {
    const { error } = await client.from("custom_services").upsert(
      {
        slug: service.slug,
        name: service.name,
        description: service.description,
        status: service.status,
        pricing_type: service.pricingType,
        base_price: service.basePrice,
        estimated_min_price: service.estimatedMinPrice,
        estimated_max_price: service.estimatedMaxPrice,
        minimum_quantity: service.minimumQuantity,
        maximum_quantity: service.maximumQuantity,
        requires_upload: service.requiresUpload,
        requires_notes: service.requiresNotes,
        requires_review: service.requiresReview,
        allowed_file_types: service.allowedFileTypes,
        is_stackable: service.isStackable,
        exclusive_group: service.exclusiveGroup,
        sort_order: service.sortOrder
      },
      { onConflict: "slug" }
    );

    if (error) {
      return NextResponse.json(
        { error: `Failed to save service ${service.slug}: ${error.message}`, issues: [] },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ ok: true, issues: [] });
}

function parseServicesPayload(value: unknown): CustomService[] | null {
  if (!isRecord(value) || !Array.isArray(value.services)) {
    return null;
  }

  const services: CustomService[] = [];

  for (const item of value.services) {
    if (!isRecord(item)) {
      return null;
    }

    services.push({
      id: readString(item.id),
      slug: readString(item.slug),
      name: readString(item.name),
      description: readNullableString(item.description),
      status: readStatus(item.status),
      pricingType: readPricingType(item.pricingType),
      basePrice: readNumber(item.basePrice),
      estimatedMinPrice: readNullableNumber(item.estimatedMinPrice),
      estimatedMaxPrice: readNullableNumber(item.estimatedMaxPrice),
      minimumQuantity: readNumber(item.minimumQuantity),
      maximumQuantity: readNullableNumber(item.maximumQuantity),
      requiresUpload: item.requiresUpload === true,
      requiresNotes: item.requiresNotes === true,
      requiresReview: item.requiresReview === true,
      allowedFileTypes: readStringArray(item.allowedFileTypes),
      isStackable: item.isStackable === true,
      exclusiveGroup: readNullableString(item.exclusiveGroup),
      sortOrder: readNumber(item.sortOrder),
      pricingRules: []
    });
  }

  return services;
}

function validateServices(services: CustomService[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const slugs = new Set<string>();

  for (const service of services) {
    if (!service.name.trim()) {
      issues.push(error(`service.${service.id}.name`, "Nama layanan wajib diisi."));
    }

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(service.slug)) {
      issues.push(error(`service.${service.id}.slug`, "Slug layanan wajib kebab-case."));
    }

    if (slugs.has(service.slug)) {
      issues.push(error(`service.${service.id}.slug`, "Slug layanan duplikat."));
    }
    slugs.add(service.slug);

    if (!Number.isInteger(service.minimumQuantity) || service.minimumQuantity < 1) {
      issues.push(error(`service.${service.id}.minimum`, "Minimum layanan wajib positif."));
    }

    if (!Number.isInteger(service.basePrice) || service.basePrice < 0) {
      issues.push(error(`service.${service.id}.price`, "Harga layanan wajib positif."));
    }
  }

  return issues;
}

function readPricingType(value: unknown): ServicePricingType {
  if (
    value === "fixed_per_order" ||
    value === "tiered" ||
    value === "estimated" ||
    value === "manual_quote"
  ) {
    return value;
  }

  return "fixed_per_item";
}

function readStatus(value: unknown): CustomService["status"] {
  if (value === "inactive" || value === "archived") {
    return value;
  }

  return "active";
}

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function readNullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function readNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function readNullableNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : ["png", "jpg", "jpeg", "pdf"];
}

function error(field: string, message: string): ValidationIssue {
  return { field, message, severity: "error" };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
