import {
  categorizeStatement,
  normalizeHolderName,
  prepareStatement,
} from "@xtrakto/core";
import { reconcile } from "@xtrakto/parsers";
import { describe, expect, it } from "vitest";
import { EXAMPLE_HOLDER } from "./example-quarter.constants";
import { exampleQuarter } from "./example-quarter.helpers";

const KEY = "test-key-with-at-least-32-characters!";

// Categorized as ingestion does it, with the account's holder name.
const categorized = async () =>
  categorizeStatement(await prepareStatement(exampleQuarter(), KEY), {
    holderName: normalizeHolderName(EXAMPLE_HOLDER),
  }).transactions;

describe("exampleQuarter", () => {
  it("reconciles to the cent, as a verified quarterly statement", () => {
    expect(reconcile(exampleQuarter()).balanceVerified).toBe(true);
  });

  it("stays within its quarter, and its balance never goes below zero", () => {
    const { period, transactions } = exampleQuarter();

    for (const { date, balanceAfterMinor } of transactions) {
      expect(date > period.from && date <= period.to).toBe(true);
      expect(balanceAfterMinor).toBeGreaterThanOrEqual(0);
    }
  });

  // What every screen shows: should a rule change, the example still fills
  // Resumen, Categorías, Pagos fijos and the quick review.
  it("gives every screen something to show", async () => {
    const movements = await categorized();
    const categories = new Set(movements.map(({ categoryId }) => categoryId));
    const asked = new Set(
      movements.flatMap(({ isPendingReview, categoryRuleId }) =>
        isPendingReview ? [categoryRuleId] : [],
      ),
    );

    expect([...categories]).toEqual(
      expect.arrayContaining([
        "income_transfer",
        "interest",
        "own_account_transfer",
        "credit_card_payment",
        "investment",
        "loan_payment",
        "utilities",
        "groceries",
        "restaurants",
        "transport",
        "subscriptions",
        "health",
        "cash_withdrawal",
        "taxes_and_fees",
        "payment_gateways",
        "transfers_to_people",
      ]),
    );
    expect(asked.size).toBeGreaterThanOrEqual(6);
  });
});
