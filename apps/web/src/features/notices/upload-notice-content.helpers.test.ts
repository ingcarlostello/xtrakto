import {
  amountMinorSchema,
  findRecurringPayments,
  localDateSchema,
  periodSchema,
  type RecurringMovement,
} from "@xtrakto/core";
import type { IngestionJobResult } from "@xtrakto/db";
import { describe, expect, it } from "vitest";
import {
  countRisenBy,
  statementsBrought,
} from "./upload-notice-content.helpers";

const BILL = "PAGO PSE EMPRESA DE ENERGIA";

const bill = (date: string, pesos: number): RecurringMovement => ({
  date: localDateSchema.parse(date),
  amountMinor: amountMinorSchema.parse(-pesos * 100),
  descriptionRaw: BILL,
  referenceHash: null,
  referenceLast4: null,
  categoryId: "utilities",
  categoryRuleId: null,
});

const paymentsOf = (...amounts: readonly [number, number, number]) =>
  findRecurringPayments([
    bill("2026-08-05", amounts[0]),
    bill("2026-09-05", amounts[1]),
    bill("2026-10-05", amounts[2]),
  ]).spending;

const LAST = {
  date: localDateSchema.parse("2026-10-05"),
  descriptionRaw: BILL,
};

describe("countRisenBy", () => {
  it("counts a payment whose highest month the upload brought", () => {
    expect(countRisenBy(paymentsOf(100_000, 101_000, 130_000), [LAST])).toBe(1);
  });

  it("leaves out one that rose in a month the upload didn't bring", () => {
    expect(
      countRisenBy(paymentsOf(100_000, 101_000, 130_000), [
        { ...LAST, date: localDateSchema.parse("2026-09-05") },
      ]),
    ).toBe(0);
    expect(countRisenBy(paymentsOf(100_000, 101_000, 130_000), [])).toBe(0);
  });

  it("leaves out another text on that day", () => {
    expect(
      countRisenBy(paymentsOf(100_000, 101_000, 130_000), [
        { ...LAST, descriptionRaw: "COMPRA EN TIENDA" },
      ]),
    ).toBe(0);
  });

  it("leaves out one that didn't rise, though the upload brought it", () => {
    expect(countRisenBy(paymentsOf(100_000, 100_000, 100_000), [LAST])).toBe(0);
    expect(countRisenBy(paymentsOf(130_000, 130_000, 101_000), [LAST])).toBe(0);
  });
});

describe("statementsBrought", () => {
  const statement = (id: string, to: string) => ({
    id,
    accountId: "a1",
    bankId: "bancolombia",
    period: periodSchema.parse({ from: "2026-01-01", to }),
    balance: "none" as const,
    differenceMinor: null,
    chainedTo: null,
  });
  const job = (
    jobStatement: ReturnType<typeof statement> | null,
    stats: IngestionJobResult["stats"],
  ): IngestionJobResult => ({
    id: "job",
    status: jobStatement === null ? "failed" : "done",
    formatId: null,
    isSlow: false,
    errorCode: null,
    stats,
    statement: jobStatement,
  });
  const NEW = { total: 3, skipped: 0 };

  it("orders what the upload brought, the latest first", () => {
    const brought = statementsBrought([
      job(statement("july", "2026-07-31"), NEW),
      job(statement("october", "2026-10-31"), NEW),
    ]);

    expect(brought.map(({ id }) => id)).toEqual(["october", "july"]);
  });

  it("leaves out the same file again, and a file that failed", () => {
    expect(
      statementsBrought([
        job(statement("again", "2026-07-31"), { total: 3, skipped: 3 }),
        job(null, {}),
      ]),
    ).toEqual([]);
  });

  it("keeps a file that brought only hidden movements", () => {
    expect(
      statementsBrought([
        job(statement("hidden", "2026-07-31"), {
          total: 3,
          skipped: 1,
          added: 0,
        }),
      ]),
    ).toHaveLength(1);
  });
});
