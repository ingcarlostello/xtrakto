import { describe, expect, it } from "vitest";
import type { CategoryId } from "../categories/category.types";
import type { CategorizationRuleId } from "../categorization/categorization.types";
import { localDateSchema } from "../dates/date.schemas";
import { amountMinorSchema } from "../money/money.schemas";
import { summarizeMovements } from "./summary.helpers";
import type { SummaryMovement } from "./summary.types";

const movement = (
  date: string,
  amountMinor: number,
  [categoryId, categoryRuleId]: [CategoryId, CategorizationRuleId] | [] = [],
): SummaryMovement => ({
  date: localDateSchema.parse(date),
  amountMinor: amountMinorSchema.parse(amountMinor),
  categoryId: categoryId ?? null,
  categoryRuleId: categoryRuleId ?? null,
});

const total = (amountMinor: number, count: number) => ({ amountMinor, count });
const NOTHING = total(0, 0);

// A quarter, out of order as a query may bring it: a salary, interest from
// the account and its investment, money back from the user's own name, a
// key payment and a Nequi send, a purchase, a withdrawal, the 4x1000 and a
// fee, a card payment, an investment, money to the user's own name, and
// money each way that no rule knows.
const QUARTER = [
  movement("2026-08-10", 320_000_000, ["income_transfer", "interbank_in"]),
  movement("2026-07-01", 289, ["interest", "savings_interest"]),
  movement("2026-09-04", 1_950_000, ["interest", "investment_interest"]),
  movement("2026-08-08", 45_000_000, ["own_account_transfer", "own_name_in"]),
  movement("2026-07-02", 1_000_000),
  movement("2026-07-01", -2_000_000, ["transfers_to_people", "nequi_out"]),
  movement("2026-08-12", -6_000_000, ["transfers_to_people", "key_payment"]),
  movement("2026-08-18", -23_015_000, ["groceries", "merchant_groceries"]),
  movement("2026-07-20", -30_000_000, ["cash_withdrawal", "cash_withdrawal"]),
  movement("2026-07-15", -480_000, ["taxes_and_fees", "gmf_tax"]),
  movement("2026-07-16", -1_200_000, ["taxes_and_fees", "bank_fee"]),
  movement("2026-07-10", -125_000_000, ["credit_card_payment", "card_payment"]),
  movement("2026-08-10", -100_000_000, ["investment", "investment_opening"]),
  movement("2026-07-03", -20_000_000, [
    "own_account_transfer",
    "own_name_out_cut",
  ]),
  movement("2026-09-01", -700_000),
];

describe("summarizeMovements", () => {
  const summary = summarizeMovements(QUARTER);

  it("adds up what went out, whatever its kind, and each kind as the movements list does", () => {
    expect(summary.outflows).toEqual(total(-308_395_000, 10));
    expect(summary.kinds).toEqual({
      income: total(321_950_289, 3),
      spending: total(-62_695_000, 6),
      moved: { out: total(-245_000_000, 3), back: total(45_000_000, 1) },
    });
  });

  it("lists real spending and income by category, the largest first", () => {
    expect(summary.spendingByCategory).toEqual([
      { categoryId: "cash_withdrawal", ...total(-30_000_000, 1) },
      { categoryId: "groceries", ...total(-23_015_000, 1) },
      { categoryId: "transfers_to_people", ...total(-8_000_000, 2) },
      { categoryId: "taxes_and_fees", ...total(-1_680_000, 2) },
    ]);
    expect(summary.incomeByCategory).toEqual([
      { categoryId: "income_transfer", ...total(320_000_000, 1) },
      { categoryId: "interest", ...total(1_950_289, 2) },
    ]);
  });

  it("lists money that moved by type, each way, the most that went out first", () => {
    expect(summary.movedByCategory).toEqual([
      {
        categoryId: "credit_card_payment",
        out: total(-125_000_000, 1),
        back: NOTHING,
      },
      { categoryId: "investment", out: total(-100_000_000, 1), back: NOTHING },
      {
        categoryId: "own_account_transfer",
        out: total(-20_000_000, 1),
        back: total(45_000_000, 1),
      },
    ]);
  });

  it("adds up the interest, the 4x1000 apart from the bank's fees, the cash and the card payments", () => {
    expect(summary.interest).toEqual(total(1_950_289, 2));
    expect(summary.gmfTax).toEqual(total(-480_000, 1));
    expect(summary.cash).toEqual(total(-30_000_000, 1));
    expect(summary.cardPayments).toEqual(total(-125_000_000, 1));
  });

  it("adds up each day with movements by kind, the oldest first", () => {
    expect(summary.days.map(({ date }) => date)).toEqual([
      "2026-07-01",
      "2026-07-02",
      "2026-07-03",
      "2026-07-10",
      "2026-07-15",
      "2026-07-16",
      "2026-07-20",
      "2026-08-08",
      "2026-08-10",
      "2026-08-12",
      "2026-08-18",
      "2026-09-01",
      "2026-09-04",
    ]);
    expect(summary.days[0]?.kinds).toEqual({
      income: total(289, 1),
      spending: total(-2_000_000, 1),
      moved: { out: NOTHING, back: NOTHING },
    });
    expect(summary.days[8]?.kinds).toEqual({
      income: total(320_000_000, 1),
      spending: NOTHING,
      moved: { out: total(-100_000_000, 1), back: NOTHING },
    });
  });

  it("keeps the table's order between categories that add up the same", () => {
    const tie = summarizeMovements([
      movement("2026-07-01", -1_000, ["restaurants", "merchant_restaurants"]),
      movement("2026-07-01", -1_000, ["groceries", "merchant_groceries"]),
    ]);

    expect(tie.spendingByCategory.map(({ categoryId }) => categoryId)).toEqual([
      "groceries",
      "restaurants",
    ]);
  });

  it("adds a movement of 0 to no side", () => {
    const zero = summarizeMovements([
      movement("2026-07-01", 0, ["other_spending", "no_description_out"]),
    ]);

    expect(zero.outflows).toEqual(NOTHING);
    expect(zero.spendingByCategory).toEqual([]);
  });

  it("adds up nothing without movements", () => {
    expect(summarizeMovements([])).toEqual({
      outflows: NOTHING,
      kinds: {
        income: NOTHING,
        spending: NOTHING,
        moved: { out: NOTHING, back: NOTHING },
      },
      spendingByCategory: [],
      incomeByCategory: [],
      movedByCategory: [],
      days: [],
      interest: NOTHING,
      gmfTax: NOTHING,
      cash: NOTHING,
      cardPayments: NOTHING,
    });
  });
});
