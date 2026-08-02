import { NextResponse } from "next/server";
import {
  Phase13AuthError,
  phase13ErrorResponse,
  requirePhase13Actor
} from "@/lib/phase13-auth";
import { getProductManagerCapabilities } from "@/lib/product-manager";
import type { CustomService, ValidationIssue } from "@/lib/types";
import { z } from "zod";
import { instantServiceInputFieldSchema } from "@/lib/instant-custom";

const serviceMutationSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z.string().trim().min(1).max(150),
  description: z.string().trim().max(500).nullable().optional(),
  status: z.enum(["active", "inactive", "archived"]),
  pricingType: z.enum(["fixed_per_item", "fixed_per_order", "tiered", "estimated", "manual_quote"]),
  basePrice: z.number().int().nonnegative(),
  estimatedMinPrice: z.number().int().nonnegative().nullable().optional(),
  estimatedMaxPrice: z.number().int().nonnegative().nullable().optional(),
  minimumQuantity: z.number().int().positive(),
  maximumQuantity: z.number().int().positive().nullable().optional(),
  requiresUpload: z.boolean(),
  requiresNotes: z.boolean(),
  requiresReview: z.boolean(),
  allowedFileTypes: z.array(z.string().trim().min(1).max(20)).max(30),
  isStackable: z.boolean(),
  exclusiveGroup: z.string().trim().max(100).nullable().optional(),
  sortOrder: z.number().int(),
  inputSchema: z.array(instantServiceInputFieldSchema).max(20).default([])
});

type ParsedCustomService = CustomService & {
  inputSchema: z.infer<typeof instantServiceInputFieldSchema>[];
};

export async function POST(request: Request) {
  try {
    const actor = await requirePhase13Actor(request, request.method === "GET" ? "content.read" : "content.manage");
    if (!getProductManagerCapabilities(actor.role).canEditDraft) {
      throw new Phase13AuthError(403, "Role ini tidak memiliki akses untuk mengubah katalog layanan.");
    }

    const body: unknown = await request.json();
    const services = parseServicesPayload(body);

    if (!services) {
      return NextResponse.json(
        { error: "Invalid service catalog payload.", issues: [] },
        { status: 400, headers: { "cache-control": "private, no-store" } }
      );
    }

    const issues = validateServices(services);
    if (issues.some((issue) => issue.severity === "error")) {
      return NextResponse.json(
        { error: "Validation failed.", issues },
        { status: 422, headers: { "cache-control": "private, no-store" } }
      );
    }

    for (const service of services) {
      const row = {
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
        sort_order: service.sortOrder,
        input_schema: service.inputSchema
      };
      const mutation = service.id
        ? actor.adminClient.from("custom_services").update(row).eq("id", service.id)
        : actor.adminClient.from("custom_services").upsert(row, { onConflict: "slug" });
      const { data, error } = await mutation.select("id").maybeSingle();

      if (error || !data) {
        return NextResponse.json(
          {
            error: error
              ? `Failed to save service ${service.slug}: ${error.message}`
              : `Service ${service.slug} tidak ditemukan atau tidak dapat diubah.`,
            issues: []
          },
          {
            status: error ? 500 : 404,
            headers: { "cache-control": "private, no-store" }
          }
        );
      }
    }

    return NextResponse.json(
      { ok: true, issues: [] },
      { headers: { "cache-control": "private, no-store" } }
    );
  } catch (error) {
    const response = phase13ErrorResponse(error);
    response.headers.set("cache-control", "private, no-store");
    return response;
  }
}

function parseServicesPayload(value: unknown): ParsedCustomService[] | null {
  if (!isRecord(value) || !Array.isArray(value.services)) {
    return null;
  }
  const parsed = z.array(serviceMutationSchema).max(100).safeParse(value.services);
  if (!parsed.success) return null;
  return parsed.data.map((service) => ({
    ...service,
    id: service.id ?? "",
    description: service.description ?? null,
    estimatedMinPrice: service.estimatedMinPrice ?? null,
    estimatedMaxPrice: service.estimatedMaxPrice ?? null,
    maximumQuantity: service.maximumQuantity ?? null,
    exclusiveGroup: service.exclusiveGroup ?? null,
    pricingRules: []
  }));
}

function validateServices(services: CustomService[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const slugs = new Set<string>();

  for (const service of services) {
    if (!service.name.trim()) {
      issues.push(error(`service.${service.id}.name`, "Nama layanan wajib diisi."));
    }

    if (service.id && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(service.id)) {
      issues.push(error(`service.${service.id}.id`, "ID layanan tidak valid."));
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

function error(field: string, message: string): ValidationIssue {
  return { field, message, severity: "error" };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
