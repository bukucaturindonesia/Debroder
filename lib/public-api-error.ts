import {
  canonicalErrorResponse,
  createServerRequestContext,
  type ServerRequestContext
} from "@/lib/observability/server";

export type PublicApiErrorDefinition = {
  code: string;
  message: string;
  status: number;
};

const DEFAULT_ERROR: PublicApiErrorDefinition = {
  code: "PUBLIC_OPERATION_FAILED",
  message: "Permintaan belum dapat diproses. Coba lagi atau hubungi Admin DEBRODER.",
  status: 500
};

export function publicApiErrorResponse(
  error: unknown,
  context: string,
  definition: Partial<PublicApiErrorDefinition> = {},
  requestContext?: Request | ServerRequestContext
) {
  const resolved = { ...DEFAULT_ERROR, ...definition };
  const observability = isServerRequestContext(requestContext)
    ? requestContext
    : createServerRequestContext(requestContext, context);
  return canonicalErrorResponse({
    error,
    context: observability,
    definition: resolved
  });
}

export function safePublicResponse(body: unknown, status = 200, headers?: HeadersInit) {
  const resolvedHeaders = new Headers(headers);
  resolvedHeaders.set(
    "cache-control",
    resolvedHeaders.get("cache-control") ?? "private, no-store"
  );
  resolvedHeaders.set(
    "referrer-policy",
    resolvedHeaders.get("referrer-policy") ?? "no-referrer"
  );
  resolvedHeaders.set(
    "x-content-type-options",
    resolvedHeaders.get("x-content-type-options") ?? "nosniff"
  );
  return Response.json(body, {
    status,
    headers: resolvedHeaders
  });
}

function isServerRequestContext(
  value: Request | ServerRequestContext | undefined
): value is ServerRequestContext {
  return Boolean(value && "requestId" in value && "correlationId" in value);
}
