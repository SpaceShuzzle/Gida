import StellarSdk from "@stellar/stellar-sdk";
import { RoutingResult } from "./types";
import { extractRouting } from "./extract";

const { Transaction } = StellarSdk;

/**
 * Extracts routing information from a Stellar transaction.
 *
 * @param {Transaction} tx - The transaction to extract routing info from.
 * @returns {RoutingResult | null} The routing result or null if the transaction is not a simple payment.
 */
export function extractRoutingFromTx(tx: any): RoutingResult | null {
  // Fee-bump and envelope objects may not expose `operations`; a malformed
  // transaction should yield null rather than a TypeError.
  if (!tx || !Array.isArray(tx.operations)) return null;

  const op = tx.operations[0];
  if (!op || op.type !== "payment" || typeof op.destination !== "string") {
    return null;
  }

  const memo = tx.memo ?? { type: "none", value: null };

  return extractRouting({
    destination: op.destination,
    memoType: typeof memo.type === "string" ? memo.type : "none",
    memoValue:
      memo.value === null || memo.value === undefined
        ? null
        : String(memo.value),
    sourceAccount: tx.source ?? null,
  });
}
