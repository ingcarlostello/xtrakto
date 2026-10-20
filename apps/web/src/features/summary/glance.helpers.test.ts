import {
  amountMinorSchema,
  type CategoryId,
  type PeriodSummary,
} from "@xtrakto/core";
import { describe, expect, it } from "vitest";
import type { MovementPeriod } from "@/utils/transactions-url.helpers";
import { glanceSubtitle, glanceTiles, glanceTitle } from "./glance.helpers";

const total = (amountMinor: number, count: number) => ({
  amountMinor: amountMinorSchema.parse(amountMinor),
  count,
});
const NOTHING = total(0, 0);
const of = (categoryId: CategoryId, amountMinor: number, count: number) => ({
  categoryId,
  ...total(amountMinor, count),
});

const QUARTER: MovementPeriod = { kind: "quarter", year: 2026, quarter: 3 };
const AUGUST: MovementPeriod = { kind: "month", year: 2026, month: 8 };

// v8-01's quarter: $54,2M out, $24,4M of it real spending and $29,8M that
// only moved, with $2,8M back; $46,8M in, 85% of it in two transfers.
const SUMMARY: PeriodSummary = {
  outflows: total(-5_420_000_000, 60),
  kinds: {
    income: total(4_680_000_000, 12),
    spending: total(-2_440_000_000, 40),
    moved: { out: total(-2_980_000_000, 20), back: total(280_000_000, 3) },
  },
  spendingByCategory: [
    of("loan_payment", -462_000_000, 3),
    of("groceries", -410_000_000, 26),
    of("cash_withdrawal", -315_000_000, 17),
    of("transfers_to_people", -186_000_000, 58),
    of("restaurants", -235_000_000, 31),
  ],
  incomeByCategory: [
    of("income_transfer", 3_978_000_000, 2),
    of("interest", 702_000_000, 10),
  ],
  movedByCategory: [
    { categoryId: "investment", out: total(-2_605_000_000, 13), back: NOTHING },
    {
      categoryId: "credit_card_payment",
      out: total(-375_000_000, 7),
      back: NOTHING,
    },
    // Back from the user's Nequi, and none sent there.
    {
      categoryId: "own_account_transfer",
      out: NOTHING,
      back: total(280_000_000, 3),
    },
  ],
  days: [],
  interest: total(132_000, 90),
  gmfTax: total(-1_976_000, 9),
  cash: total(-315_000_000, 17),
  cardPayments: total(-375_000_000, 7),
};

// A quarter where money only came in.
const ONLY_IN: PeriodSummary = {
  ...SUMMARY,
  outflows: NOTHING,
  kinds: {
    income: total(13_200, 30),
    spending: NOTHING,
    moved: { out: NOTHING, back: NOTHING },
  },
  spendingByCategory: [],
  incomeByCategory: [of("interest", 13_200, 30)],
  movedByCategory: [],
};

describe("the glance's texts", () => {
  it("names a quarter's glance and a month's", () => {
    expect(glanceTitle(QUARTER)).toBe("Tu trimestre de un vistazo");
    expect(glanceTitle(AUGUST)).toBe("Tu mes de un vistazo");
  });

  it("says what went out, and that not all of it was spending", () => {
    expect(glanceSubtitle(QUARTER, SUMMARY)).toBe(
      "Julio a septiembre de 2026. Salieron $54,2M, pero no todo fue gasto.",
    );
  });

  it("says only what went out when all of it was spending", () => {
    const allSpent = {
      ...SUMMARY,
      kinds: { ...SUMMARY.kinds, moved: { out: NOTHING, back: NOTHING } },
    };

    expect(glanceSubtitle(AUGUST, allSpent)).toBe(
      "Agosto de 2026. Salieron $54,2M.",
    );
  });

  it("says when nothing went out", () => {
    expect(glanceSubtitle(QUARTER, ONLY_IN)).toBe(
      "Julio a septiembre de 2026. No salió plata de tu cuenta.",
    );
  });
});

describe("glanceTiles", () => {
  const link = { accountId: "a1", period: QUARTER };

  it("reads each kind with its ring, its total, what it means and its movements", () => {
    expect(glanceTiles(SUMMARY, link)).toEqual([
      {
        tone: "income",
        label: "Ingresos",
        percent: 85,
        amount: "$46,8M",
        note: "El 85% llegó en 2 transferencias. No incluye $2,8M que volvió de tus cuentas.",
        action: {
          label: "Ver ingresos",
          href: {
            pathname: "/transactions",
            query: { account: "a1", period: "2026-q3", filter: "income" },
          },
        },
      },
      {
        tone: "spending",
        label: "Gasto real",
        percent: 45,
        amount: "$24,4M",
        note: "El 45% de lo que salió. Créditos, mercado, efectivo y pagos a personas.",
        action: {
          label: "Ver en qué gastaste",
          href: {
            pathname: "/transactions",
            query: { account: "a1", period: "2026-q3", filter: "spending" },
          },
        },
      },
      {
        tone: "moved",
        label: "Movido",
        percent: 55,
        amount: "$29,8M",
        note: "El 55% de lo que salió: a tu inversión y a tus tarjetas. Además volvieron $2,8M.",
        action: {
          label: "Ver a dónde se movió",
          href: {
            pathname: "/transactions",
            query: { account: "a1", period: "2026-q3", filter: "moved" },
          },
        },
      },
    ]);
  });

  it("reads a quarter where money only came in, its rings empty but its income's", () => {
    const [income, spending, moved] = glanceTiles(ONLY_IN, { period: QUARTER });

    expect(income).toMatchObject({
      percent: 100,
      amount: "$132",
      note: "El 100% llegó en 30 abonos de intereses.",
    });
    expect(spending).toMatchObject({
      percent: 0,
      amount: "$0",
      note: "No hubo gasto real en este periodo.",
    });
    expect(moved).toMatchObject({
      percent: 0,
      note: "No moviste plata entre tus cuentas, tu inversión ni tus tarjetas.",
    });
  });

  it("says nothing came back when nothing did", () => {
    const noneBack = {
      ...SUMMARY,
      kinds: {
        ...SUMMARY.kinds,
        moved: { out: SUMMARY.kinds.moved.out, back: NOTHING },
      },
    };
    const [income, , moved] = glanceTiles(noneBack, { period: QUARTER });

    expect(income?.note).toBe("El 85% llegó en 2 transferencias.");
    expect(moved?.note).toBe(
      "El 55% de lo que salió: a tu inversión y a tus tarjetas.",
    );
  });

  it("says what came back when nothing came in nor moved out", () => {
    const backOnly = {
      ...ONLY_IN,
      kinds: {
        ...ONLY_IN.kinds,
        income: NOTHING,
        moved: { out: NOTHING, back: total(30_000_000, 1) },
      },
      incomeByCategory: [],
    };
    const [income, , moved] = glanceTiles(backOnly, { period: QUARTER });

    expect(income?.note).toBe(
      "No entró plata de otros en este periodo. No incluye $300 mil que volvió de tus cuentas.",
    );
    expect(moved?.note).toBe("Volvieron $300 mil.");
  });
});
