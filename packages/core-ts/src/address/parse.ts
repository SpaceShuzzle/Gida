import { decodeMuxed } from "../muxed/decode";
import { detect } from "./detect";
import { ParseResult, Warning } from "./types";
import { AddressParseError } from "../address/errors";
import type { ErrorCode } from "../address/errors";

// Every Stellar strkey (G, M, C) is 56 base32 characters long.
const STRKEY_LENGTH = 56;
const NON_CANONICAL_ADDRESS_MESSAGE = "Address normalized to uppercase";
const BASE32_BODY = /^[A-Z2-7]+$/;

/**
 * Classifies a string that failed detection so callers receive the same
 * specific ErrorCode the Go and Dart implementations report.
 */
function classifyInvalidAddress(up: string): ErrorCode {
  const first = up[0];
  if (first !== "G" && first !== "M" && first !== "C") {
    return "UNKNOWN_PREFIX";
  }
  if (up.length !== STRKEY_LENGTH) {
    return "INVALID_LENGTH";
  }
  if (!BASE32_BODY.test(up)) {
    return "INVALID_BASE32";
  }
  return "INVALID_CHECKSUM";
}

const INVALID_ADDRESS_MESSAGES: Record<ErrorCode, string> = {
  INVALID_CHECKSUM: "Invalid address checksum",
  INVALID_LENGTH: "Invalid address length",
  INVALID_BASE32: "Invalid base32 encoding",
  REJECTED_SEED_KEY: "Secret keys are not valid addresses",
  REJECTED_PREAUTH: "Pre-authorized transaction hashes are not valid addresses",
  REJECTED_HASH_X: "Hash-X keys are not valid addresses",
  FEDERATION_ADDRESS_NOT_SUPPORTED: "Federation addresses are not supported",
  UNKNOWN_PREFIX: "Invalid address",
};

/**
 * Parses a Stellar address string and returns a structured result.
 * Supports G (Public Key), C (Contract), and M (Muxed) addresses.
 * 
 * @param address - The Stellar address string to parse.
 * @returns A {@link ParseResult} containing the parsed address components.
 * @throws {AddressParseError} If the address prefix is unknown or checksum/length validation fails.
 */
export function parse(address: string): ParseResult {
  // Keep the documented AddressParseError contract even for JavaScript
  // callers that pass null/undefined instead of a string.
  if (typeof address !== "string") {
    throw new AddressParseError("UNKNOWN_PREFIX", String(address), "Invalid address");
  }

  const up = address.toUpperCase();
  const kind = detect(up);
  const lowercaseWarnings: Warning[] =
    address === up
      ? []
      : [
          {
            code: "NON_CANONICAL_ADDRESS",
            severity: "warn",
            message: NON_CANONICAL_ADDRESS_MESSAGE,
            normalization: { original: address, normalized: up },
          },
        ];

  if (kind === "invalid") {
    const code = classifyInvalidAddress(up);
    throw new AddressParseError(code, address, INVALID_ADDRESS_MESSAGES[code]);
  }

  switch (kind) {
    case "G":
      return { kind: "G", address: up, warnings: lowercaseWarnings };
    case "C":
      return { kind: "C", address: up, warnings: lowercaseWarnings };
    case "M": {
      try {
        const decoded = decodeMuxed(up);
        return {
          kind: "M",
          address: up,
          baseG: decoded.baseG,
          muxedId: decoded.id,
          warnings: lowercaseWarnings,
        };
      } catch (error) {
        if (error instanceof AddressParseError) {
          throw error;
        }

        throw new AddressParseError(
          "INVALID_CHECKSUM",
          address,
          "Invalid muxed address"
        );
      }
    }
  }
}

