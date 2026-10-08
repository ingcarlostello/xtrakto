import { describe, expect, it } from "vitest";
import { parsedStatementSchema } from "@xtrakto/core";
import type { ParsedStatement } from "@xtrakto/core";
import { fixtureContent } from "../../fixtures/fixture.utils";
import quarterlyBasic from "../../fixtures/quarterly-basic.json";
import quarterlyBrokenBalance from "../../fixtures/quarterly-broken-balance.json";
import quarterlyLarge from "../../fixtures/quarterly-large.json";
import quarterlyRepeatedHeader from "../../fixtures/quarterly-repeated-header.json";
import quarterlyYearRollover from "../../fixtures/quarterly-year-rollover.json";
import { bancolombiaQuarterlyParser } from "../bancolombia/quarterly-parser.helpers";
import { RECONCILIATION_ISSUE } from "./reconciliation.constants";
import { reconcile } from "./reconciliation.helpers";

const {
  ROW_BALANCE,
  CLOSING_BALANCE,
  TOTAL_CREDITS,
  TOTAL_DEBITS,
  NO_BALANCE_DATA,
} = RECONCILIATION_ISSUE;

const VERIFIED = { balanceVerified: true, issues: [] };

const parsedFixture = (fixture: unknown): ParsedStatement => {
  const result = bancolombiaQuarterlyParser.parse(fixtureContent(fixture));
  if (!result.ok) throw new Error(JSON.stringify(result.error));
  return result.value;
};

// An invented statement: 100.00 out, then 20.00 in, from 1,000.00 to 920.00.
const PURCHASE = {
  date: "2026-07-02",
  descriptionRaw: "COMPRA EN TIENDA EJEMPLO",
  descriptionNormalized: "COMPRA EN TIENDA EJEMPLO",
  amountMinor: -10_000,
  balanceAfterMinor: 90_000,
  sourceRow: 5,
};
const DEPOSIT = {
  date: "2026-07-03",
  descriptionRaw: "ABONO INTERESES AHORROS",
  descriptionNormalized: "ABONO INTERESES AHORROS",
  amountMinor: 2_000,
  balanceAfterMinor: 92_000,
  sourceRow: 6,
};
const BASE = {
  bankId: "test-bank",
  formatId: "test-bank-statement",
  accountType: "savings",
  currency: "COP",
  period: { from: "2026-07-01", to: "2026-07-31" },
  periodSource: "statement",
  openingBalanceMinor: 100_000,
  closingBalanceMinor: 92_000,
  totals: { creditsMinor: 2_000, debitsMinor: 10_000 },
  transactions: [PURCHASE, DEPOSIT],
  warnings: [],
};

// The invented statement with some fields changed, checked against the schema.
const statement = (changes: object = {}): ParsedStatement =>
  parsedStatementSchema.parse({ ...BASE, ...changes });

const failing = (...issues: object[]) => ({ balanceVerified: false, issues });

describe("reconcile", () => {
  it.each([
    { name: "quarterly-basic", fixture: quarterlyBasic },
    { name: "quarterly-year-rollover", fixture: quarterlyYearRollover },
    { name: "quarterly-repeated-header", fixture: quarterlyRepeatedHeader },
    { name: "quarterly-large", fixture: quarterlyLarge },
  ])("verifies $name to the cent", ({ fixture }) => {
    expect(reconcile(parsedFixture(fixture))).toEqual(VERIFIED);
  });

  it("reports the exact row of a misprinted amount, and the checks it breaks", () => {
    expect(reconcile(parsedFixture(quarterlyBrokenBalance))).toEqual(
      failing(
        { code: ROW_BALANCE, sourceRow: 20 },
        { code: CLOSING_BALANCE },
        { code: TOTAL_DEBITS },
      ),
    );
  });

  it("verifies a statement whose balances follow from its movements", () => {
    expect(reconcile(statement())).toEqual(VERIFIED);
  });

  it("checks the first row against the opening balance", () => {
    const result = reconcile(
      statement({
        closingBalanceMinor: undefined,
        totals: undefined,
        transactions: [
          { ...PURCHASE, balanceAfterMinor: 95_000 },
          { ...DEPOSIT, balanceAfterMinor: 97_000 },
        ],
      }),
    );

    expect(result).toEqual(failing({ code: ROW_BALANCE, sourceRow: 5 }));
  });

  it("checks each row against the balance printed on the previous one", () => {
    const result = reconcile(
      statement({
        openingBalanceMinor: undefined,
        closingBalanceMinor: undefined,
        totals: undefined,
        transactions: [PURCHASE, { ...DEPOSIT, balanceAfterMinor: 93_000 }],
      }),
    );

    expect(result).toEqual(failing({ code: ROW_BALANCE, sourceRow: 6 }));
  });

  it("can't check the row after one without a balance", () => {
    const result = reconcile(
      statement({
        transactions: [
          { ...PURCHASE, balanceAfterMinor: undefined },
          { ...DEPOSIT, balanceAfterMinor: 50_000 },
        ],
      }),
    );

    expect(result).toEqual(VERIFIED);
  });

  it("compares the closing balance with the opening balance plus every amount", () => {
    expect(reconcile(statement({ closingBalanceMinor: 91_000 }))).toEqual(
      failing({ code: CLOSING_BALANCE }),
    );
  });

  it("compares the credits with their printed total", () => {
    const totals = { creditsMinor: 3_000, debitsMinor: 10_000 };

    expect(reconcile(statement({ totals }))).toEqual(
      failing({ code: TOTAL_CREDITS }),
    );
  });

  it.each([
    { label: "a different amount", debitsMinor: 9_000 },
    { label: "a negative sign", debitsMinor: -10_000 },
  ])(
    "compares the debits with their total as a positive amount: rejects $label",
    ({ debitsMinor }) => {
      const totals = { creditsMinor: 2_000, debitsMinor };

      expect(reconcile(statement({ totals }))).toEqual(
        failing({ code: TOTAL_DEBITS }),
      );
    },
  );

  it("verifies a statement without movements whose balances match", () => {
    const empty = statement({
      closingBalanceMinor: 100_000,
      totals: { creditsMinor: 0, debitsMinor: 0 },
      transactions: [],
    });

    expect(reconcile(empty)).toEqual(VERIFIED);
  });

  it("returns NO_BALANCE_DATA, not an error, for a statement without balances", () => {
    const movementsExport = statement({
      openingBalanceMinor: undefined,
      closingBalanceMinor: undefined,
      totals: undefined,
      periodSource: "rows",
      transactions: [
        { ...PURCHASE, balanceAfterMinor: undefined },
        { ...DEPOSIT, balanceAfterMinor: undefined },
      ],
    });

    expect(reconcile(movementsExport)).toEqual(
      failing({ code: NO_BALANCE_DATA }),
    );
  });
});
