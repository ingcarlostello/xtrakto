import { describe, expect, it } from "vitest";
import { parsedTransactionSchema } from "../statements/statement.schemas";
import {
  occurrenceIndexes,
  transactionFingerprint,
} from "./transaction-fingerprint.helpers";

const movement = (fields: Record<string, unknown> = {}) =>
  parsedTransactionSchema.parse({
    date: "2026-07-01",
    descriptionRaw: "TRANSFERENCIAS A NEQUI",
    descriptionNormalized: "TRANSFERENCIAS A NEQUI",
    amountMinor: -5_000_000,
    sourceRow: 10,
    ...fields,
  });

describe("transactionFingerprint", () => {
  it("matches a vector computed outside the code", async () => {
    // sha256("xtrakto.tx.v1:" + '["2026-07-01","TRANSFERENCIAS A NEQUI",-5000000,null]' + ":0")
    expect(await transactionFingerprint(movement(), 0)).toBe(
      "46335aaebb6b469c73f3997a6f2ccd5120ef120e63876a42003c96254e596558",
    );
  });

  it("ignores what can differ between uploads of the same movement", async () => {
    const reference = await transactionFingerprint(movement(), 0);
    const other = movement({
      descriptionRaw: "TRANSFERENCIAS  A  NEQUI",
      referenceRaw: "3001234567",
      referenceKind: "phone",
      sourceRow: 99,
    });

    expect(await transactionFingerprint(other, 0)).toBe(reference);
  });

  it.each([
    ["date", { date: "2026-07-02" }],
    ["description", { descriptionNormalized: "TRANSFERENCIAS A NEQUI X" }],
    ["amount", { amountMinor: -5_000_001 }],
    ["balance after", { balanceAfterMinor: 0 }],
  ])("changes with the %s", async (_, change) => {
    expect(await transactionFingerprint(movement(change), 0)).not.toBe(
      await transactionFingerprint(movement(), 0),
    );
  });

  it("changes with the occurrence index", async () => {
    expect(await transactionFingerprint(movement(), 1)).not.toBe(
      await transactionFingerprint(movement(), 0),
    );
  });

  it("treats a composed and a decomposed accent as the same text", async () => {
    const composed = movement({ descriptionNormalized: "PAGO QR CAFÉ" });
    const decomposed = movement({ descriptionNormalized: "PAGO QR CAFÉ" });

    expect(await transactionFingerprint(decomposed, 0)).toBe(
      await transactionFingerprint(composed, 0),
    );
  });

  it("can't be forged by a description that looks like other fields", async () => {
    const plain = movement({ descriptionNormalized: "A", amountMinor: 1 });
    const crafted = movement({
      descriptionNormalized: 'A",1,null]:0:["',
      amountMinor: 1,
    });

    expect(await transactionFingerprint(crafted, 0)).not.toBe(
      await transactionFingerprint(plain, 0),
    );
  });
});

describe("occurrenceIndexes", () => {
  it("numbers identical movements in their order, and only those", () => {
    const twin = movement();
    const other = movement({ amountMinor: -1 });

    expect(occurrenceIndexes([twin, other, twin, twin])).toEqual([0, 0, 1, 2]);
  });

  it("gives a pair of twins the same numbers in any upload that holds both", () => {
    const twin = movement();
    const earlier = movement({ date: "2026-06-30" });

    expect(occurrenceIndexes([earlier, twin, twin]).slice(1)).toEqual(
      occurrenceIndexes([twin, twin]),
    );
  });
});
