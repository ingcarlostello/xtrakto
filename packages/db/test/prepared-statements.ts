import {
  type PreparedStatement,
  parsedStatementSchema,
  prepareStatement,
} from "@xtrakto/core";
import type { BalanceCheck } from "../src/statements/statement.types";
import { asAmount } from "./test-rows";

export const TEST_HASH_KEY = "test-key-with-at-least-32-characters!";

/** What `reconcile` finds in a movements export, which prints no balances. */
export const UNCHECKED: BalanceCheck = { verified: false, breakPositions: [] };

/** A statement whose balances add up. */
export const VERIFIED: BalanceCheck = {
  verified: true,
  differenceMinor: asAmount(0),
  breakPositions: [],
};

/** A statement whose closing balance is 10.00 off, from its fourth movement. */
export const UNVERIFIED: BalanceCheck = {
  verified: false,
  differenceMinor: asAmount(-1_000),
  breakPositions: [3],
};

export type TestMovement = {
  readonly date: string;
  readonly amount: number;
  readonly description?: string;
  readonly phone?: string;
};

const parsedMovement = (movement: TestMovement, sourceRow: number) => {
  const description = movement.description ?? "COMPRA EN TIENDA";
  return {
    date: movement.date,
    descriptionRaw: description,
    descriptionNormalized: description,
    amountMinor: movement.amount,
    referenceKind: movement.phone === undefined ? "none" : "phone",
    ...(movement.phone === undefined ? {} : { referenceRaw: movement.phone }),
    sourceRow,
  };
};

/** A movements export, parsed and prepared as ingestion will do it. */
export const preparedExport = (
  movements: readonly TestMovement[],
): Promise<PreparedStatement> => {
  const dates = movements.map((movement) => movement.date).sort();
  const parsed = parsedStatementSchema.parse({
    bankId: "bancolombia",
    formatId: "bancolombia-movements-export",
    accountType: "savings",
    currency: "COP",
    period: { from: dates[0], to: dates[dates.length - 1] },
    periodSource: "rows",
    transactions: movements.map(parsedMovement),
    warnings: [],
  });
  return prepareStatement(parsed, TEST_HASH_KEY);
};

export type QuarterOptions = {
  /** The day of its opening balance, the previous quarter's last day. */
  readonly from?: string;
  readonly to?: string;
  /** Changes the content, as another download of the same quarter could. */
  readonly openingMinor?: number;
};

/**
 * A quarterly statement of account 8901 for July to September 2026 by
 * default, each movement with its running balance.
 */
export const preparedQuarterly = (
  movements: readonly TestMovement[],
  {
    from = "2026-06-30",
    to = "2026-09-30",
    openingMinor = 100_000,
  }: QuarterOptions = {},
): Promise<PreparedStatement> => {
  let balance = openingMinor;
  const transactions = movements.map((movement, index) => {
    balance += movement.amount;
    return { ...parsedMovement(movement, index), balanceAfterMinor: balance };
  });
  const parsed = parsedStatementSchema.parse({
    bankId: "bancolombia",
    formatId: "bancolombia-savings-quarterly",
    accountType: "savings",
    accountLast4: "8901",
    currency: "COP",
    period: { from, to },
    periodSource: "statement",
    openingBalanceMinor: openingMinor,
    closingBalanceMinor: balance,
    transactions,
    warnings: [],
  });
  return prepareStatement(parsed, TEST_HASH_KEY);
};

/** `count` distinct purchases on consecutive days from 2026-01-01. */
export const manyMovements = (count: number): TestMovement[] =>
  Array.from({ length: count }, (_, index) => ({
    date: new Date(Date.UTC(2026, 0, 1 + Math.floor(index / 10)))
      .toISOString()
      .slice(0, 10),
    amount: -(index + 1),
  }));
