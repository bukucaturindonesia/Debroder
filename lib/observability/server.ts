import "server-only";

import { randomUUID } from "node:crypto";
import { redactObservabilityValue } from "@/lib/observability/redaction";

export type ServerRequestContext = {
  requestId: string;
  correlationId: string;
  operation: string;
  route: string | null;
  startedAt: number;
};

type StructuredLogLevel = "info" | "warn" | "error";

type CanonicalErrorDefinition = {
  code: string;
  message: string;
  status: number;
  retryable?: boolean;
};

const loggedErrors = new WeakSet<object>();
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,119}$/;

export function createServerRequestContext(
  request: Request | null | undefined,
  operation: string
): ServerRequestContext {
  const requestId = firstSafeId(
    request?.headers.get("x-request-id"),
    request?.headers.get("x-vercel-id")
  ) ?? randomUUID();
  const correlationId = firstSafeId(
    request?.headers.get("x-correlation-id"),
    requestId
  ) ?? requestId;
  return {
    requestId,
    correlationId,
    operation: operation.slice(0, 120),
    route: request ? safeRoute(request.url) : null,
    startedAt: Date.now()
  };
}

export function canonicalErrorResponse(input: {
  error: unknown;
  context: ServerRequestContext;
  definition: CanonicalErrorDefinition;
  log?: boolean;
  fields?: Readonly<Record<string, unknown>>;
}) {
  const reference = errorReference();
  if (input.log !== false) {
    logServerError(input.context, input.error, {
      event: "request.failed",
      errorCode: input.definition.code,
      status: input.definition.status,
      reference,
      ...input.fields
    });
  }
  return Response.json(
    {
      code: input.definition.code,
      error: input.definition.message,
      reference,
      retryable: input.definition.retryable ?? input.definition.status >= 500
    },
    {
      status: input.definition.status,
      headers: observabilityResponseHeaders(input.context)
    }
  );
}

export function logServerError(
  context: ServerRequestContext,
  error: unknown,
  fields: Readonly<Record<string, unknown>> = {}
) {
  if (isAlreadyLogged(error)) return false;
  writeStructuredLog("error", context, {
    ...fields,
    error: errorSummary(error)
  });
  return true;
}

export function logServerEvent(
  level: Exclude<StructuredLogLevel, "error">,
  context: ServerRequestContext,
  event: string,
  fields: Readonly<Record<string, unknown>> = {}
) {
  writeStructuredLog(level, context, { event, ...fields });
}

export function observabilityResponseHeaders(
  context: ServerRequestContext,
  headers?: HeadersInit
) {
  const output = new Headers(headers);
  output.set("cache-control", output.get("cache-control") ?? "private, no-store");
  output.set("referrer-policy", output.get("referrer-policy") ?? "no-referrer");
  output.set("x-content-type-options", output.get("x-content-type-options") ?? "nosniff");
  output.set("x-request-id", context.requestId);
  output.set("x-correlation-id", context.correlationId);
  return output;
}

function writeStructuredLog(
  level: StructuredLogLevel,
  context: ServerRequestContext,
  fields: Readonly<Record<string, unknown>>
) {
  const payload = redactObservabilityValue({
    timestamp: new Date().toISOString(),
    level,
    service: "debroder-web",
    operation: context.operation,
    route: context.route,
    requestId: context.requestId,
    correlationId: context.correlationId,
    durationMs: Math.max(0, Date.now() - context.startedAt),
    ...fields
  });
  const line = JSON.stringify(payload);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.info(line);
}

function errorSummary(value: unknown) {
  if (value instanceof Error) {
    const entries = Object.fromEntries(Object.entries(value));
    return {
      name: value.name || "Error",
      sourceCode: scalarCode(entries.code)
    };
  }
  if (value && typeof value === "object") {
    const record = Object.fromEntries(Object.entries(value));
    return {
      name: "NonErrorObject",
      sourceCode: scalarCode(record.code)
    };
  }
  return { name: typeof value, sourceCode: null };
}

function isAlreadyLogged(value: unknown) {
  if (!value || (typeof value !== "object" && typeof value !== "function")) return false;
  if (loggedErrors.has(value)) return true;
  loggedErrors.add(value);
  return false;
}

function scalarCode(value: unknown) {
  return typeof value === "string" || typeof value === "number"
    ? String(value).slice(0, 80)
    : null;
}

function firstSafeId(...values: Array<string | null | undefined>) {
  return values
    .map((value) => value?.trim() ?? "")
    .find((value) => SAFE_ID.test(value)) || null;
}

function safeRoute(value: string) {
  try {
    return new URL(value).pathname.slice(0, 300);
  } catch {
    return null;
  }
}

function errorReference() {
  return `ERR-${randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`;
}
