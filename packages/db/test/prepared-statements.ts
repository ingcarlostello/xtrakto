import {
  type PreparedStatement,
  parsedStatementSchema,
  prepareStatement,
} from "@xtrakto/core";

export const TEST_HASH_KEY = "test-key-with-at-least-32-characters!";

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

/** `count` distinct purchases on consecutive days from 2026-01-01. */
export const manyMovements = (count: number): TestMovement[] =>
  Array.from({ length: count }, (_, index) => ({
    date: new Date(Date.UTC(2026, 0, 1 + Math.floor(index / 10)))
      .toISOString()
      .slice(0, 10),
    amount: -(index + 1),
  }));
