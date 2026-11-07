import { describe, it, expect } from "vitest";
import { extractRoutingFromTx } from "./extractFromTx";

const G_ADDRESS = "GAYCUYT553C5LHVE2XPW5GMEJT4BXGM7AHMJWLAPZP53KJO7EIQADRSI";
const M_ADDRESS =
  "MAYCUYT553C5LHVE2XPW5GMEJT4BXGM7AHMJWLAPZP53KJO7EIQACAAAAAAAAAAAAD672";

function paymentTx(overrides: Record<string, unknown> = {}) {
  return {
    operations: [{ type: "payment", destination: G_ADDRESS }],
    memo: { type: "none", value: null },
    source: G_ADDRESS,
    ...overrides,
  };
}

describe("extractRoutingFromTx", () => {
  it("extracts a G-address destination with a MEMO_ID", () => {
    const result = extractRoutingFromTx(
      paymentTx({ memo: { type: "id", value: "42" } })
    );

    expect(result).not.toBeNull();
    expect(result!.destinationBaseAccount).toBe(G_ADDRESS);
    expect(result!.routingId).toBe("42");
    expect(result!.routingSource).toBe("memo");
  });

  it("extracts routing from an M-address destination", () => {
    const result = extractRoutingFromTx(
      paymentTx({
        operations: [{ type: "payment", destination: M_ADDRESS }],
      })
    );

    expect(result!.destinationBaseAccount).toBe(G_ADDRESS);
    // Muxed IDs are currently exposed as bigint; compare the decimal value.
    expect(String(result!.routingId)).toBe("0");
    expect(result!.routingSource).toBe("muxed");
  });

  it("returns null when the transaction has no operations array", () => {
    expect(extractRoutingFromTx({})).toBeNull();
    expect(extractRoutingFromTx({ operations: undefined })).toBeNull();
    expect(extractRoutingFromTx({ operations: "not-an-array" })).toBeNull();
  });

  it("returns null for a null/undefined transaction", () => {
    expect(extractRoutingFromTx(null)).toBeNull();
    expect(extractRoutingFromTx(undefined)).toBeNull();
  });

  it("returns null when the first operation is not a payment", () => {
    expect(
      extractRoutingFromTx(
        paymentTx({ operations: [{ type: "manage_sell_offer" }] })
      )
    ).toBeNull();
  });

  it("returns null when the payment operation has no destination", () => {
    expect(
      extractRoutingFromTx(paymentTx({ operations: [{ type: "payment" }] }))
    ).toBeNull();
  });

  it("treats a missing memo object as memoType 'none'", () => {
    const tx = paymentTx();
    delete (tx as Record<string, unknown>).memo;

    const result = extractRoutingFromTx(tx);

    expect(result!.routingId).toBeNull();
    expect(result!.routingSource).toBe("none");
    expect(result!.warnings).toEqual([]);
  });

  it("stringifies Buffer-style memo values", () => {
    const result = extractRoutingFromTx(
      paymentTx({
        memo: {
          type: "id",
          value: { toString: () => "9007199254740993" },
        },
      })
    );

    expect(result!.routingId).toBe("9007199254740993");
  });
});
