import { type ParsedStatement, parsedStatementSchema } from "@xtrakto/core";
import { type FormatId, normalizeDescription } from "@xtrakto/parsers";
import {
  EXAMPLE_ACCOUNT_LAST4,
  EXAMPLE_HOLDER,
  EXAMPLE_INTEREST_TEXT,
  EXAMPLE_MOVEMENTS,
  EXAMPLE_OPENING_BALANCE,
  EXAMPLE_PERIOD,
  type ExampleMovement,
} from "./example-quarter.constants";

const QUARTERLY: FormatId = "bancolombia-savings-quarterly";

const sum = (amounts: readonly number[]): number =>
  amounts.reduce((total, amount) => total + amount, 0);

// Each movement with the balance after it, as the statement prints it.
const withBalances = (movements: readonly ExampleMovement[]) =>
  movements.map(([date, text, amountMinor], index) => ({
    date,
    descriptionRaw: text,
    descriptionNormalized: normalizeDescription(text),
    amountMinor,
    balanceAfterMinor:
      EXAMPLE_OPENING_BALANCE +
      sum(movements.slice(0, index + 1).map(([, , amount]) => amount)),
    sourceRow: index + 1,
  }));

// What the statement's summary prints: money in and out, the interest, and
// an average balance halfway between the opening and the closing.
const totalsOf = (movements: readonly ExampleMovement[], closing: number) => {
  const amounts = movements.map(([, , amount]) => amount);
  const interest = movements.filter(
    ([, text]) => text === EXAMPLE_INTEREST_TEXT,
  );
  return {
    creditsMinor: sum(amounts.filter((amount) => amount > 0)),
    debitsMinor: -sum(amounts.filter((amount) => amount < 0)),
    interestMinor: sum(interest.map(([, , amount]) => amount)),
    averageBalanceMinor: Math.round((EXAMPLE_OPENING_BALANCE + closing) / 2),
  };
};

/**
 * The example's quarterly statement as its parser would read it (7.8): an
 * invented Bancolombia savings account, July to September 2026, whose
 * balances reconcile to the cent.
 */
export const exampleQuarter = (): ParsedStatement => {
  const transactions = withBalances(EXAMPLE_MOVEMENTS);
  const closing =
    transactions.at(-1)?.balanceAfterMinor ?? EXAMPLE_OPENING_BALANCE;
  return parsedStatementSchema.parse({
    bankId: "bancolombia",
    formatId: QUARTERLY,
    accountType: "savings",
    accountLast4: EXAMPLE_ACCOUNT_LAST4,
    currency: "COP",
    period: EXAMPLE_PERIOD,
    periodSource: "statement",
    openingBalanceMinor: EXAMPLE_OPENING_BALANCE,
    closingBalanceMinor: closing,
    totals: totalsOf(EXAMPLE_MOVEMENTS, closing),
    holderName: EXAMPLE_HOLDER,
    transactions,
    warnings: [],
  });
};
