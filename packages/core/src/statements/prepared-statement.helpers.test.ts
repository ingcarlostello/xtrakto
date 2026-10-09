import { describe, expect, it } from "vitest";
import { hashIdentifier } from "../hashing/identifier-hash.helpers";
import { prepareStatement } from "./prepared-statement.helpers";
import { parsedStatementSchema } from "./statement.schemas";

const KEY = "test-key-with-at-least-32-characters!";

const MOVEMENTS = [
  {
    date: "2026-10-01",
    descriptionRaw: "TRANSFERENCIAS A NEQUI",
    descriptionNormalized: "TRANSFERENCIAS A NEQUI",
    amountMinor: -5_000_000,
    referenceRaw: "3001234567",
    referenceKind: "phone",
    sourceRow: 3,
  },
  {
    date: "2026-10-01",
    descriptionRaw: "TRANSFERENCIAS A NEQUI",
    descriptionNormalized: "TRANSFERENCIAS A NEQUI",
    amountMinor: -5_000_000,
    referenceRaw: "3001234567",
    referenceKind: "phone",
    sourceRow: 2,
  },
  {
    date: "2026-10-02",
    descriptionRaw: "ABONO INTERESES AHORROS",
    descriptionNormalized: "ABONO INTERESES AHORROS",
    amountMinor: 12,
    referenceKind: "none",
    sourceRow: 1,
  },
];

const statement = (movements: readonly object[] = MOVEMENTS) =>
  parsedStatementSchema.parse({
    bankId: "bancolombia",
    formatId: "bancolombia-movements-export",
    accountType: "savings",
    currency: "COP",
    period: { from: "2026-10-01", to: "2026-10-02" },
    periodSource: "rows",
    transactions: movements,
    warnings: [],
  });

describe("prepareStatement", () => {
  it("replaces raw references with their HMAC, and keeps no source rows", async () => {
    const [first, , interest] = (await prepareStatement(statement(), KEY))
      .transactions;

    expect(first?.referenceHash).toBe(await hashIdentifier("3001234567", KEY));
    expect(interest?.referenceHash).toBeUndefined();
    expect(first).not.toHaveProperty("referenceRaw");
    expect(first).not.toHaveProperty("sourceRow");
  });

  it("numbers twins and keeps the statement's order", async () => {
    const prepared = (await prepareStatement(statement(), KEY)).transactions;

    expect(
      prepared.map(({ occurrenceIndex, position }) => ({
        occurrenceIndex,
        position,
      })),
    ).toEqual([
      { occurrenceIndex: 0, position: 0 },
      { occurrenceIndex: 1, position: 1 },
      { occurrenceIndex: 0, position: 2 },
    ]);
    expect(new Set(prepared.map((t) => t.fingerprint)).size).toBe(3);
  });

  it("gives the same statement the same content hash, and a changed one another", async () => {
    const original = await prepareStatement(statement(), KEY);
    const again = await prepareStatement(statement(), KEY);
    const corrected = await prepareStatement(
      statement(
        MOVEMENTS.map((movement, index) =>
          index === 2 ? { ...movement, amountMinor: 13 } : movement,
        ),
      ),
      KEY,
    );

    expect(again.contentHash).toBe(original.contentHash);
    expect(corrected.contentHash).not.toBe(original.contentHash);
  });
});
