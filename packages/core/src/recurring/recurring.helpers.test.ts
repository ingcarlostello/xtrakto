import { describe, expect, it } from "vitest";
import type { CategoryId } from "../categories/category.types";
import type { CategorizationRuleId } from "../categorization/categorization.types";
import { localDateSchema } from "../dates/date.schemas";
import { amountMinorSchema } from "../money/money.schemas";
import { findRecurringPayments } from "./recurring.helpers";
import type { RecurringMovement } from "./recurring.types";

type Paid = {
  readonly text: string;
  readonly categoryId: CategoryId;
  readonly rule?: CategorizationRuleId;
  /** The number paid: its HMAC and last 4 digits. */
  readonly reference?: readonly [string, string];
};

const payment = (
  date: string,
  amountMinor: number,
  { text, categoryId, rule, reference }: Paid,
): RecurringMovement => ({
  date: localDateSchema.parse(date),
  amountMinor: amountMinorSchema.parse(amountMinor),
  descriptionRaw: text,
  referenceHash: reference?.[0] ?? null,
  referenceLast4: reference?.[1] ?? null,
  categoryId,
  categoryRuleId: rule ?? null,
});

// The same payment on each date.
const monthly = (paid: Paid, amountMinor: number, dates: readonly string[]) =>
  dates.map((date) => payment(date, amountMinor, paid));

const month = (value: number) => ({ year: 2026, month: value });

const LOAN: Paid = {
  text: "PAGO PSE Financiera Andes S",
  categoryId: "loan_payment",
};
const GYM: Paid = { text: "COMPRA EN  GIMNASIO FIT", categoryId: "health" };
const SUMMER = ["2026-07-10", "2026-08-10", "2026-09-10"];

describe("findRecurringPayments", () => {
  it("finds a loan paid in two installments each month, stable", () => {
    const { spending, moved } = findRecurringPayments([
      payment("2026-07-01", -154_000_000, LOAN),
      payment("2026-07-04", -31_100_000, LOAN),
      payment("2026-08-02", -154_000_000, LOAN),
      payment("2026-08-04", -31_100_000, LOAN),
      payment("2026-09-01", -154_000_000, LOAN),
      payment("2026-09-03", -31_100_000, LOAN),
    ]);

    expect(moved).toEqual([]);
    expect(spending).toEqual([
      {
        label: "Financiera Andes S",
        referenceLast4: null,
        bankTexts: ["PAGO PSE Financiera Andes S"],
        categoryId: "loan_payment",
        channels: ["pse"],
        months: [7, 8, 9].map((value) => ({
          month: month(value),
          amountMinor: -185_100_000,
          count: 2,
        })),
        typicalAmountMinor: -185_100_000,
        days: { first: 1, last: 4 },
        lastDate: "2026-09-03",
        trend: { kind: "stable" },
      },
    ]);
  });

  it("finds a bill however the bank cut its name, and says it rose", () => {
    const energy = (text: string): Paid => ({ text, categoryId: "utilities" });

    const { spending } = findRecurringPayments([
      payment(
        "2026-07-15",
        -16_230_000,
        energy("PAGO PSE Electrificadora de S"),
      ),
      payment("2026-08-14", -16_500_000, energy("PAGO PSE Electrificadora de")),
      payment("2026-09-16", -18_200_000, energy("PAGO PSE Electrificadora de")),
    ]);

    expect(spending).toHaveLength(1);
    expect(spending[0]).toMatchObject({
      label: "Electrificadora de",
      bankTexts: [
        "PAGO PSE Electrificadora de",
        "PAGO PSE Electrificadora de S",
      ],
      typicalAmountMinor: -16_500_000,
      days: { first: 14, last: 16 },
      trend: { kind: "rose", percent: 12 },
    });
  });

  it.each([
    ["the same each month", [110_000, 110_000, 110_000], { kind: "stable" }],
    [
      "a little, its last month not the highest",
      [90_000, 100_000, 96_000],
      { kind: "varies_little" },
    ],
    [
      "a little, rising less than 5%",
      [100_000, 97_000, 103_000],
      { kind: "varies_little" },
    ],
    ["a lot", [100_000, 130_000, 80_000], { kind: "variable" }],
  ])("says a bill that moves %s does so", (_, amounts, trend) => {
    const water: Paid = {
      text: "PAGO PSE Acueducto Municipa",
      categoryId: "utilities",
    };

    const { spending } = findRecurringPayments(
      SUMMER.map((date, index) => payment(date, -(amounts[index] ?? 0), water)),
    );

    expect(spending[0]?.trend).toEqual(trend);
  });

  it("finds one payment paid through another channel, and orders them by amount", () => {
    const gas = (text: string): Paid => ({ text, categoryId: "utilities" });

    const { spending } = findRecurringPayments([
      payment("2026-07-08", -3_099_000, gas("TRANSF A GAS NATURAL CIUDAD")),
      payment("2026-08-10", -3_099_000, gas("PAGO PSE GAS NATURAL CIUDAD")),
      payment("2026-09-12", -3_099_000, gas("PAGO PSE GAS NATURAL CIUDAD")),
      ...monthly(GYM, -11_000_000, SUMMER),
    ]);

    expect(spending.map(({ label }) => label)).toEqual([
      "GIMNASIO FIT",
      "GAS NATURAL CIUDAD",
    ]);
    expect(spending[1]).toMatchObject({
      channels: ["transfer", "pse"],
      days: { first: 8, last: 12 },
      trend: { kind: "stable" },
    });
  });

  it("lists card payments and savings apart, however much the card's amount moves", () => {
    const card: Paid = {
      text: "PAGO SUC VIRT TC MASTER PESOS",
      categoryId: "credit_card_payment",
    };
    const savings: Paid = {
      text: "PAGO LLAVE AHORRO DOLAR",
      categoryId: "investment",
    };

    const { spending, moved } = findRecurringPayments([
      payment("2026-07-01", -4_800_000, card),
      payment("2026-08-08", -120_000_000, card),
      payment("2026-09-03", -209_000_000, card),
      ...monthly(savings, -200_000_000, [
        "2026-07-04",
        "2026-08-04",
        "2026-09-04",
      ]),
    ]);

    expect(spending).toEqual([]);
    expect(
      moved.map(({ label, trend }) => ({ label, trend: trend.kind })),
    ).toEqual([
      { label: "AHORRO DOLAR", trend: "stable" },
      { label: "TC MASTER PESOS", trend: "variable" },
    ]);
  });

  it("finds sends to one Nequi number, which its text doesn't name", () => {
    const send = (hash: string, last4: string): Paid => ({
      text: "TRANSFERENCIAS A NEQUI",
      categoryId: "transfers_to_people",
      reference: [hash, last4],
    });

    const { spending } = findRecurringPayments([
      ...monthly(send("hmac-1270", "1270"), -50_000_000, [
        "2026-07-05",
        "2026-08-05",
        "2026-09-06",
      ]),
      // Another number, two months only.
      payment("2026-07-20", -30_000_000, send("hmac-6543", "6543")),
      payment("2026-09-02", -30_000_000, send("hmac-6543", "6543")),
    ]);

    expect(spending).toHaveLength(1);
    expect(spending[0]).toMatchObject({
      label: "TRANSFERENCIAS A NEQUI",
      referenceLast4: "1270",
      channels: ["nequi"],
    });
  });

  it.each([
    ["two months", ["2026-08-10", "2026-09-10"], [-11_000_000]],
    [
      "months not in a row",
      ["2026-06-10", "2026-08-10", "2026-09-10"],
      [-11_000_000],
    ],
    [
      "days far apart",
      ["2026-07-02", "2026-08-25", "2026-09-10"],
      [-11_000_000],
    ],
    [
      "an amount far from the typical one",
      SUMMER,
      [-11_000_000, -40_000_000, -11_000_000],
    ],
  ])("finds nothing fixed in payments on %s", (_, dates, amounts) => {
    const payments = dates.map((date, index) =>
      payment(date, amounts[index] ?? amounts[0] ?? 0, GYM),
    );

    expect(findRecurringPayments(payments)).toEqual({
      spending: [],
      moved: [],
    });
  });

  it("leaves out the 4x1000, cash, money in, and texts that name no one", () => {
    const found = findRecurringPayments([
      ...monthly(
        {
          text: "IMPTO GOBIERNO 4X1000",
          categoryId: "taxes_and_fees",
          rule: "gmf_tax",
        },
        -480_000,
        SUMMER,
      ),
      ...monthly(
        {
          text: "RETIRO CAJERO  ATM PLAZA CENTR",
          categoryId: "cash_withdrawal",
        },
        -30_000_000,
        SUMMER,
      ),
      ...monthly(
        {
          text: "PAGO INTERBANC EMPRESA EJEMPLO",
          categoryId: "income_transfer",
        },
        320_000_000,
        SUMMER,
      ),
      // Money back from the user's own name only moved, but came in.
      ...monthly(
        { text: "TRANSF DE ANA PRUEBA", categoryId: "own_account_transfer" },
        45_000_000,
        SUMMER,
      ),
      ...monthly(
        { text: "TRANSFERENCIAS A NEQUI", categoryId: "transfers_to_people" },
        -2_000_000,
        SUMMER,
      ),
      ...monthly({ text: "0", categoryId: "other_spending" }, -100_000, SUMMER),
    ]);

    expect(found).toEqual({ spending: [], moved: [] });
  });

  it("keeps a payment that stopped, with the months it repeated in", () => {
    const { spending } = findRecurringPayments([
      ...monthly(GYM, -11_000_000, ["2026-01-10", "2026-02-10", "2026-03-10"]),
      payment("2026-06-10", -11_000_000, GYM),
    ]);

    expect(spending[0]).toMatchObject({
      months: [1, 2, 3].map((value) => ({ month: month(value) })),
      lastDate: "2026-03-10",
    });
  });

  it("joins earlier months of a run while they look like the latest", () => {
    const { spending } = findRecurringPayments([
      payment("2026-02-10", -40_000_000, GYM),
      ...monthly(GYM, -11_000_000, [
        "2026-03-10",
        "2026-04-10",
        "2026-05-10",
        "2026-06-10",
        "2026-07-10",
      ]),
    ]);

    expect(
      spending[0]?.months.map(({ month: { month: value } }) => value),
    ).toEqual([3, 4, 5, 6, 7]);
  });

  it("never joins a short name to a longer one that starts with it", () => {
    const key = (text: string): Paid => ({
      text,
      categoryId: "transfers_to_people",
    });

    const { spending } = findRecurringPayments([
      ...monthly(key("PAGO LLAVE ANA"), -5_000_000, [
        "2026-07-03",
        "2026-08-03",
        "2026-09-03",
      ]),
      ...monthly(key("PAGO LLAVE ANA MARIA LOPEZ"), -8_000_000, SUMMER),
    ]);

    expect(spending.map(({ label }) => label)).toEqual([
      "ANA MARIA LOPEZ",
      "ANA",
    ]);
  });
});
