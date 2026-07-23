import type { InternalContractError, PublicContractError } from "../contracts/error";
import { CONTRACT_VERSIONS } from "../contracts/version";
import { asRecord, readNonEmptyString } from "./core";

export type DatabaseErrorCompatibilityInput = {
  error: unknown;
  referenceId: string;
  occurredAt: string;
  operation?: string;
};

export type DatabaseErrorCompatibilityResult = {
  publicError: PublicContractError;
  internalError: InternalContractError;
  sourceCode: string | null;
};

function publicDescriptor(code: string | null): Pick<PublicContractError, "code" | "message" | "retryable"> {
  switch (code) {
    case "23505":
      return {
        code: "infrastructure.conflict",
        message: "Data berubah atau sudah digunakan. Muat ulang lalu coba kembali.",
        retryable: false
      };
    case "23503":
      return {
        code: "infrastructure.reference_conflict",
        message: "Data terkait tidak lagi tersedia untuk operasi ini.",
        retryable: false
      };
    case "42501":
      return {
        code: "authorization.forbidden",
        message: "Anda tidak memiliki izin untuk operasi ini.",
        retryable: false
      };
    case "PGRST116":
      return {
        code: "infrastructure.not_found",
        message: "Data yang diminta tidak ditemukan.",
        retryable: false
      };
    case "42P01":
    case "PGRST202":
    case "PGRST205":
      return {
        code: "infrastructure.schema_unavailable",
        message: "Layanan data belum tersedia. Coba kembali nanti.",
        retryable: true
      };
    default:
      return {
        code: "infrastructure.database_unavailable",
        message: "Layanan data sedang bermasalah. Coba kembali nanti.",
        retryable: true
      };
  }
}

export function mapDatabaseErrorCompatibility(
  input: DatabaseErrorCompatibilityInput
): DatabaseErrorCompatibilityResult {
  const record = asRecord(input.error);
  const sourceCode = readNonEmptyString(record?.code);
  const descriptor = publicDescriptor(sourceCode);
  const publicError: PublicContractError = {
    contractVersion: CONTRACT_VERSIONS.error,
    ...descriptor,
    referenceId: input.referenceId
  };
  const internalError: InternalContractError = {
    ...publicError,
    occurredAt: input.occurredAt,
    ...(input.operation ? { operation: input.operation } : {}),
    context: {
      sourceCode,
      details: readNonEmptyString(record?.details),
      hint: readNonEmptyString(record?.hint)
    },
    cause: input.error
  };

  return { publicError, internalError, sourceCode };
}
