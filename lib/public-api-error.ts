import { randomUUID } from "node:crypto";

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
  definition: Partial<PublicApiErrorDefinition> = {}
) {
  const reference = `ERR-${randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`;
  const internal = error instanceof Error ? error.message : String(error ?? "unknown");
  console.error(`[${reference}] ${context}`, { error: internal });

  const resolved = { ...DEFAULT_ERROR, ...definition };
  return Response.json(
    {
      code: resolved.code,
      error: resolved.message,
      reference
    },
    {
      status: resolved.status,
      headers: {
        "cache-control": "private, no-store",
        "referrer-policy": "no-referrer",
        "x-content-type-options": "nosniff"
      }
    }
  );
}

export function safePublicResponse(body: unknown, status = 200, headers?: HeadersInit) {
  return Response.json(body, {
    status,
    headers: {
      "cache-control": "private, no-store",
      "referrer-policy": "no-referrer",
      "x-content-type-options": "nosniff",
      ...headers
    }
  });
}
