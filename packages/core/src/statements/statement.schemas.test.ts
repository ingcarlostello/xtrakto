import { describe, expect, expectTypeOf, it } from "vitest";
import type { LocalDate, Period } from "../dates/date.types";
import {
  MAX_SHEET_ROWS,
  MAX_TEXT_LENGTH,
} from "../extracted-content/extracted-content.constants";
import type { AmountMinor } from "../money/money.types";
import {
  parsedStatementSchema,
  parsedTransactionSchema,
} from "./statement.schemas";
import type { ParsedStatement, ParsedTransaction } from "./statement.types";

// Invented values only: no real names, accounts or amounts.
const transaction = {
  date: "2026-07-01",
  descriptionRaw: "COMPRA EN  TIENDA EJEMPLO",
  descriptionNormalized: "COMPRA EN TIENDA EJEMPLO",
  amountMinor: -5_000_000,
  balanceAfterMinor: 120_000_000,
  sourceRow: 14,
};

const nequiTransfer = {
  date: "2026-07-02",
  descriptionRaw: "TRANSFERENCIAS A NEQUI",
  descriptionNormalized: "TRANSFERENCIAS A NEQUI",
  amountMinor: -2_000_000,
  referenceRaw: "3001234567",
  referenceKind: "phone",
  sourceRow: 3,
};

const quarterlyStatement = {
  bankId: "bancolombia",
  formatId: "bancolombia-savings-quarterly",
  accountType: "savings",
  accountLast4: "1234",
  currency: "COP",
  period: { from: "2026-06-30", to: "2026-09-30" },
  periodSource: "statement",
  openingBalanceMinor: 125_000_000,
  closingBalanceMinor: 120_000_000,
  totals: {
    creditsMinor: 0,
    debitsMinor: 5_000_000,
    interestMinor: 0,
    withholdingMinor: 0,
    averageBalanceMinor: 122_500_000,
  },
  holderName: "ANA PRUEBA",
  transactions: [transaction],
  warnings: [{ code: "UNEXPECTED_ROW", sourceRow: 20 }],
};

const movementsExport = {
  bankId: "bancolombia",
  formatId: "bancolombia-movements-export",
  accountType: "savings",
  currency: "COP",
  period: { from: "2026-07-02", to: "2026-07-02" },
  periodSource: "rows",
  transactions: [nequiTransfer],
  warnings: [],
};

const isValidStatement = (statement: unknown) =>
  parsedStatementSchema.safeParse(statement).success;

const isValidTransaction = (value: unknown) =>
  parsedTransactionSchema.safeParse(value).success;

describe("parsedStatementSchema", () => {
  it.each([
    {
      label: "a quarterly statement with balances and totals",
      statement: quarterlyStatement,
    },
    {
      label: "a movements export without balances or account",
      statement: movementsExport,
    },
    {
      label: "a statement without movements",
      statement: { ...movementsExport, transactions: [] },
    },
  ])("accepts $label", ({ statement }) => {
    expect(parsedStatementSchema.parse(statement)).toEqual(statement);
  });

  it("types dates and amounts with the domain types", () => {
    expectTypeOf<ParsedTransaction["date"]>().toEqualTypeOf<LocalDate>();
    expectTypeOf<
      ParsedTransaction["amountMinor"]
    >().toEqualTypeOf<AmountMinor>();
    expectTypeOf<ParsedStatement["period"]>().toExtend<Period>();
  });

  it.each([
    { label: "an unknown account type", change: { accountType: "checking" } },
    { label: "a full account number", change: { accountLast4: "01234567890" } },
    { label: "a non-numeric last 4", change: { accountLast4: "12a4" } },
    { label: "an unsupported currency", change: { currency: "USD" } },
    {
      label: "a period that ends before it starts",
      change: { period: { from: "2026-09-30", to: "2026-06-30" } },
    },
    { label: "an unknown period source", change: { periodSource: "guess" } },
    {
      label: "a bank id that isn't kebab-case",
      change: { bankId: "Bancolombia" },
    },
    { label: "an empty format id", change: { formatId: "" } },
    { label: "an empty holder name", change: { holderName: "" } },
    {
      label: "a fractional balance",
      change: { closingBalanceMinor: 1_200_000.5 },
    },
    { label: "an unknown total", change: { totals: { feesMinor: 0 } } },
    {
      label: "an unknown warning code",
      change: { warnings: [{ code: "ODD_ROW" }] },
    },
    {
      label: "an extra field such as the holder's address",
      change: { address: "CALLE FALSA 123" },
    },
  ])("rejects $label", ({ change }) => {
    expect(isValidStatement({ ...quarterlyStatement, ...change })).toBe(false);
  });

  it.each([
    "bankId",
    "formatId",
    "accountType",
    "currency",
    "period",
    "periodSource",
    "transactions",
    "warnings",
  ])("requires %s", (field) => {
    const statement = Object.fromEntries(
      Object.entries(movementsExport).filter(([key]) => key !== field),
    );

    expect(isValidStatement(statement)).toBe(false);
  });

  it.each(["transactions", "warnings"] as const)(
    "accepts %s up to one per source row, and rejects more",
    (field) => {
      const item =
        field === "transactions" ? transaction : { code: "UNEXPECTED_ROW" };
      const filled = (count: number) => ({
        ...movementsExport,
        [field]: Array.from({ length: count }, () => item),
      });

      expect(isValidStatement(filled(MAX_SHEET_ROWS))).toBe(true);
      expect(isValidStatement(filled(MAX_SHEET_ROWS + 1))).toBe(false);
    },
    // Validates 20,001 movements one by one: under a second on a laptop, but
    // over Vitest's 5-second default on a CI runner busy with other packages.
    30_000,
  );
});

describe("parsedTransactionSchema", () => {
  it("accepts a movement with a hashed-later phone reference", () => {
    expect(isValidTransaction(nequiTransfer)).toBe(true);
  });

  it.each([
    { label: "a date without a year", change: { date: "1/07" } },
    { label: "a fractional amount", change: { amountMinor: -50_000.5 } },
    { label: "an amount as text", change: { amountMinor: "-50,000.00" } },
    { label: "an empty description", change: { descriptionRaw: "" } },
    {
      label: "a description longer than a cell",
      change: { descriptionNormalized: "A".repeat(MAX_TEXT_LENGTH + 1) },
    },
    { label: "an unknown reference kind", change: { referenceKind: "email" } },
    { label: "an empty reference", change: { referenceRaw: "" } },
    { label: "a negative source row", change: { sourceRow: -1 } },
    { label: "a fractional source row", change: { sourceRow: 1.5 } },
    { label: "an extra field", change: { categoryId: "groceries" } },
  ])("rejects $label", ({ change }) => {
    expect(isValidTransaction({ ...transaction, ...change })).toBe(false);
  });
});
