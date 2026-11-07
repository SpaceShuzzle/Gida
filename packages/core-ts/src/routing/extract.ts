import { RoutingInput, RoutingResult } from "./types";
import { Warning, WarningSeverity } from "../address/types";
import { parse } from "../address/parse";
import { AddressParseError } from "../address/errors";
import { normalizeMemoTextId } from "./memo";
import { WARNING_MESSAGES } from "./warnings";

const SEVERITY_ORDER: Record<WarningSeverity, number> = {
  info: 0,
  warn: 1,
  error: 2,
};

// Stellar StrKeys contain printable ASCII only. Strip Unicode characters that
// cannot be rendered (category C), line/paragraph separators, and default-
// ignorable code points such as zero-width spaces, bidi controls, variation
// selectors, and byte-order marks. Surrounding Unicode whitespace is trimmed
// separately; printable characters inside the address remain invalid input.
const HIDDEN_OR_NON_PRINTABLE =
  /[\p{C}\p{Zl}\p{Zp}\p{Default_Ignorable_Code_Point}]/gu;

function sanitizeDestination(destination: string): {
  destination: string;
  modified: boolean;
} {
  const sanitized = destination.replace(HIDDEN_OR_NON_PRINTABLE, "").trim();
  return { destination: sanitized, modified: sanitized !== destination };
}

function filterBySeverity(
  warnings: Warning[],
  minSeverity: WarningSeverity
): Warning[] {
  const threshold = SEVERITY_ORDER[minSeverity];
  return warnings.filter((w) => SEVERITY_ORDER[w.severity] >= threshold);
}

/**
 * Accepts mixed-case severity names from JavaScript callers and falls back to
 * "info" for anything unrecognized. Without this an invalid level produced an
 * undefined threshold and silently dropped every warning.
 */
function normalizeMinSeverity(value: unknown): WarningSeverity {
  if (typeof value !== "string") return "info";

  switch (value.toLowerCase()) {
    case "warn":
    case "warning":
      return "warn";
    case "error":
      return "error";
    default:
      return "info";
  }
}

/**
 * Maps the documented memo type spellings ("ID", "MEMO_TEXT", "memo-hash", …)
 * onto the canonical internal values. SEP-7 uses MEMO_* and the public docs use
 * the short uppercase form, while Horizon uses the lowercase form. Unknown
 * non-empty values are returned unchanged so an UNSUPPORTED_MEMO_TYPE warning
 * still reports the caller's spelling.
 */
function normalizeMemoType(memoType: unknown): string {
  if (typeof memoType !== "string" || memoType.length === 0) return "none";

  const compact = memoType.toLowerCase().replace(/[_\-\s]/g, "");
  switch (compact) {
    case "":
    case "none":
      return "none";
    case "id":
    case "memoid":
      return "id";
    case "text":
    case "memotext":
      return "text";
    case "hash":
    case "memohash":
      return "hash";
    case "return":
    case "memoreturn":
      return "return";
    default:
      return memoType;
  }
}

/**
 * Memo values arrive as strings from Horizon, but JavaScript callers may pass
 * numbers or bigints. Coerce those instead of throwing inside the string-based
 * memo normalizer; non-scalar values are treated as absent.
 */
function coerceMemoValue(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "bigint") {
    return String(value);
  }
  return null;
}

export class ExtractRoutingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExtractRoutingError";
    Object.setPrototypeOf(this, ExtractRoutingError.prototype);
  }
}

/**
 * Validates that the destination string passes the minimum structural
 * requirements for a Stellar address before routing logic is applied.
 * Only G-addresses and M-addresses are valid routing targets.
 * Throws ExtractRoutingError for anything that fails this check.
 */
function assertRoutableAddress(destination: unknown): asserts destination is string {
  if (!destination || typeof destination !== "string") {
    throw new ExtractRoutingError(
      "Invalid input: destination must be a non-empty string."
    );
  }

  const prefix = destination[0]?.toUpperCase();
  if (prefix !== "G" && prefix !== "M") {
    throw new ExtractRoutingError(
      `Invalid destination: expected a G or M address, got "${destination}".`
    );
  }
}

/**
 * Extracts deposit routing information from a Stellar address and memo.
 * 
 * Routing Policy:
 * 1. M-addresses: Routing ID is extracted from the address; any memo is ignored for routing.
 * 2. G-addresses: Routing ID is extracted from MEMO_ID or numeric MEMO_TEXT if valid.
 * 
 * @param input - The destination address and optional memo components.
 * @returns A result containing the base account, routing ID, source, and any warnings.
 */
export function extractRouting(input: RoutingInput): RoutingResult {
  const rawDestination = input?.destination;
  if (typeof rawDestination !== "string") {
    assertRoutableAddress(rawDestination);
  }

  const sanitized = sanitizeDestination(rawDestination);
  const destination = sanitized.destination;
  assertRoutableAddress(destination);

  const memoType = normalizeMemoType(input.memoType);
  const memoValue = coerceMemoValue(input.memoValue);

  const minSeverity = normalizeMinSeverity(input.minSeverityLevel);
  const sanitizationWarnings: Warning[] = sanitized.modified
    ? [
        {
          code: "SANITIZED_HIDDEN_CHARS",
          severity: "info",
          message: WARNING_MESSAGES.SANITIZED_HIDDEN_CHARS,
        },
      ]
    : [];

  if (input.sourceAccount) {
    try {
      const source = parse(input.sourceAccount);
      if (source.kind === "C") {
        const warnings: Warning[] = [
          ...sanitizationWarnings,
          {
            code: "CONTRACT_SENDER_DETECTED",
            severity: "info",
            message: WARNING_MESSAGES.CONTRACT_SENDER_DETECTED,
          },
        ];
        return {
          destinationBaseAccount: null,
          routingId: null,
          routingSource: "none",
          warnings: filterBySeverity(warnings, minSeverity),
        };
      }
    } catch {
      // Ignore source account parsing errors for routing extraction
    }
  }

  let parsed;

  try {
    parsed = parse(destination);
  } catch (error) {
    if (error instanceof AddressParseError) {
      return {
        destinationBaseAccount: null,
        routingId: null,
        routingSource: "none",
        warnings: filterBySeverity(sanitizationWarnings, minSeverity),
        destinationError: {
          code: error.code,
          message: error.message,
        },
      };
    }
    throw error;
  }

  if (parsed.kind === "invalid") {
    return {
      destinationBaseAccount: null,
      routingId: null,
      routingSource: "none",
      warnings: filterBySeverity(sanitizationWarnings, minSeverity),
    };
  }

  if (parsed.kind === "C") {
    const warnings: Warning[] = [
      ...sanitizationWarnings,
      ...parsed.warnings,
    ];

    warnings.push({
      code: "INVALID_DESTINATION",
      severity: "error",
      message: "C address is not a valid destination",
      context: {
        destinationKind: "C",
      },
    });

    return {
      destinationBaseAccount: null,
      routingId: null,
      routingSource: "none",
      warnings: filterBySeverity(warnings, minSeverity),
    };
  }

  if (parsed.kind === "M") {
    const warnings: Warning[] = [
      ...sanitizationWarnings,
      ...parsed.warnings,
    ];

    if (
      memoType === "id" ||
      (memoType === "text" && /^\d+$/.test(memoValue ?? ""))
    ) {
      warnings.push({
        code: "MEMO_PRESENT_WITH_MUXED",
        severity: "warn",
        message:
          "Routing ID found in both M-address and Memo. M-address ID takes precedence.",
      });
    } else if (memoType !== "none") {
      warnings.push({
        code: "MEMO_IGNORED_FOR_MUXED",
        severity: "info",
        message:
          "Memo present with M-address. Any potential routing ID in memo is ignored.",
      });
    }

    return {
      destinationBaseAccount: parsed.baseG,
      routingId: parsed.muxedId,
      routingSource: "muxed",
      warnings: filterBySeverity(warnings, minSeverity),
    };
  }

  let routingId: string | bigint | null = null;
  let routingSource: "none" | "memo" = "none";
  const warnings: Warning[] = [
    ...sanitizationWarnings,
    ...parsed.warnings,
  ];

  if (memoType === "id") {
    const rawValue = memoValue ?? "";
    const norm = normalizeMemoTextId(rawValue);

    if (norm.normalized) {
      // Explicit bigint parsing for MEMO_ID to avoid Number precision issues.
      const parsedMemoId = BigInt(norm.normalized);
      routingId = parsedMemoId.toString();
      routingSource = "memo";
      warnings.push(...norm.warnings);
    } else {
      routingSource = "none";
      warnings.push(...norm.warnings);
      warnings.push({
        code: "MEMO_ID_INVALID_FORMAT",
        severity: "warn",
        message: "MEMO_ID was empty, non-numeric, or exceeded uint64 max.",
      });
    }
  } else if (memoType === "text" && memoValue) {
    const norm = normalizeMemoTextId(memoValue);
    if (norm.normalized) {
      routingId = norm.normalized;
      routingSource = "memo";
      warnings.push(...norm.warnings);
    } else {
      warnings.push({
        code: "MEMO_TEXT_UNROUTABLE",
        severity: "warn",
        message: "MEMO_TEXT was not a valid numeric uint64.",
      });
    }
  } else if (memoType === "hash" || memoType === "return") {
    // MATCH the spec schema and the Go/Dart implementations: hash and return
    // memos are structurally valid but unsupported for routing. They are not
    // MEMO_TEXT failures, which is reserved for non-numeric MEMO_TEXT values.
    warnings.push({
      code: "UNSUPPORTED_MEMO_TYPE",
      severity: "warn",
      message: `Memo type ${memoType} is not supported for routing.`,
      context: { memoType },
    });
  } else if (memoType !== "none") {
    warnings.push({
      code: "UNSUPPORTED_MEMO_TYPE",
      severity: "warn",
      message: `Unrecognized memo type: ${memoType}`,
      context: { memoType: "unknown" },
    });
  }

  return {
    destinationBaseAccount: parsed.address,
    routingId,
    routingSource,
    warnings: filterBySeverity(warnings, minSeverity),
  };
}