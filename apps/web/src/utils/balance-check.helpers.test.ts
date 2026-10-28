import { parsedStatementSchema } from "@xtrakto/core";
import { describe, expect, it } from "vitest";
import { balanceCheckOf } from "./balance-check.helpers";

// A quarterly statement opening at 1,000.00 with two movements, each with
// its printed balance; the second balance and the closing one can be off.
const quarterly = ({ secondBalance = 1_050_00, closing = 1_050_00 } = {}) =>
  parsedStatementSchema.parse({
    bankId: "bancolombia",
    formatId: "bancolombia-savings-quarterly",
    accountType: "savings",
    accountLast4: "2109",
    currency: "COP",
    period: { from: "2026-06-30", to: "2026-09-30" },
    periodSource: "statement",
    openingBalanceMinor: 1_000_00,
    closingBalanceMinor: closing,
    transactions: [
      { amountMinor: 100_00, balanceAfterMinor: 1_100_00 },
      { amountMinor: -50_00, balanceAfterMinor: secondBalance },
    ].map((movement, sourceRow) => ({
      ...movement,
      date: "2026-07-01",
      descriptionRaw: "COMPRA EN TIENDA",
      descriptionNormalized: "COMPRA EN TIENDA",
      referenceKind: "none",
      sourceRow,
    })),
    warnings: [],
  });

describe("balanceCheckOf", () => {
  it("keeps nothing off for a statement that reconciles", () => {
    expect(balanceCheckOf(quarterly())).toEqual({
      verified: true,
      differenceMinor: 0,
      breakPositions: [],
    });
  });

  it("keeps the closing difference and the movement whose balance breaks the chain", () => {
    const statement = quarterly({ secondBalance: 1_040_00, closing: 1_040_00 });

    expect(balanceCheckOf(statement)).toEqual({
      verified: false,
      differenceMinor: -10_00,
      breakPositions: [1],
    });
  });
});
