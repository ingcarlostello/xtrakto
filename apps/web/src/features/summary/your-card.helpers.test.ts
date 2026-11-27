import {
  amountMinorSchema,
  periodSchema,
  type PreparedCard,
  preparedCardSchema,
} from "@xtrakto/core";
import type { AccountRow, CardFigures } from "@xtrakto/db";
import { describe, expect, it } from "vitest";
import { summaryTitle, yourCardView } from "./your-card.helpers";

const NU_CARD: AccountRow = {
  id: "a1",
  bankId: "nu",
  accountType: "credit_card",
  last4: "5678",
};

// Nu's September: what's due by 4 October, and the debt that clears it.
const NU: PreparedCard = preparedCardSchema.parse({
  creditLimitMinor: 500_000_000,
  availableMinor: 376_543_300,
  minimumPaymentMinor: 15_012_345,
  totalPaymentMinor: 123_456_789,
  dueDate: "2026-10-04",
  cutDate: "2026-09-11",
  summary: {
    kind: "nu",
    dueThisMonthMinor: 0,
    interestMinor: 0,
    advanceFeesMinor: 0,
    serviceFeesMinor: 0,
    conversionChargesMinor: 0,
    paymentsToMinimumMinor: 0,
    refundsMinor: 0,
    paymentsToTotalMinor: 0,
    remainingDebtMinor: 0,
  },
  installments: [],
});

// Bancolombia's: its debt from its charges, payments and what's in favor.
const bancolombia = (paymentsMinor: number): PreparedCard =>
  preparedCardSchema.parse({
    creditLimitMinor: 800_000_000,
    availableMinor: 420_000_000,
    minimumPaymentMinor: 57_450_100,
    totalPaymentMinor: 378_450_100,
    dueDate: "2026-10-15",
    summary: {
      kind: "bancolombia",
      total: {
        previousBalanceMinor: 0,
        purchasesMinor: 0,
        lateInterestMinor: 0,
        interestMinor: 0,
        advancesMinor: 0,
        otherChargesMinor: 0,
        chargesMinor: 428_450_030,
        paymentsMinor,
        creditInFavorMinor: 0,
      },
      minimum: {
        installmentsMinor: 0,
        earlierInstallmentsMinor: 0,
        advanceInstallmentsMinor: 0,
        lateInterestMinor: 0,
        interestMinor: 0,
        otherChargesMinor: 0,
        overdueMinor: 0,
        inFavorMinor: 0,
      },
    },
    installments: [],
  });

const figuresOf = (
  card: PreparedCard,
  { from = "2026-08-12", to = "2026-09-10", isVerified = true } = {},
  differenceMinor: number | null = isVerified ? 0 : null,
): CardFigures => ({
  period: periodSchema.parse({ from, to }),
  isVerified,
  differenceMinor:
    differenceMinor === null ? null : amountMinorSchema.parse(differenceMinor),
  card,
});

const viewOf = (...cardFigures: CardFigures[]) =>
  yourCardView({ account: NU_CARD, cardFigures, usuryRates: new Map() });

// September's usury, invented: 28,34% a year is 2.1010% a month.
const SEPTEMBER_USURY = new Map([["2026-09", 283_400]]);

// Nu's September with its purchases' monthly rates.
const nuWithRates = (...rates: number[]): PreparedCard =>
  preparedCardSchema.parse({
    ...NU,
    installments: rates.map((monthlyRatePpm, index) => ({
      fingerprint: String(index).repeat(64),
      number: 1,
      count: 12,
      monthlyRatePpm,
    })),
  });

describe("yourCardView", () => {
  it("reads the debt on the day its statement was cut, what's due and by when, and its limit", () => {
    expect(viewOf(figuresOf(NU))).toEqual({
      debt: { label: "Deuda al 11 de septiembre", amount: "$1.234.567,89" },
      due: {
        label: "Fecha límite de pago: 4 de octubre",
        payments: [
          { label: "Pago mínimo", value: "$150.123,45" },
          { label: "Pago total", value: "$1.234.567,89" },
        ],
      },
      account: "Tarjeta de crédito · Nu ••••5678",
      figures: [
        { label: "Cupo total", value: "$5,0M" },
        { label: "Disponible", value: "$3,8M" },
      ],
      status: {
        tone: "ok",
        title: "Cuadra con tu extracto",
        detail: "Sus movimientos y cuotas dan lo que dice tu banco.",
      },
    });
  });

  it("works Bancolombia's debt out from its charges and payments, on its period's last day", () => {
    const owed = viewOf(
      figuresOf(bancolombia(50_000_000), {
        from: "2026-08-31",
        to: "2026-09-30",
      }),
    );
    expect(owed.debt).toEqual({
      label: "Deuda al 30 de septiembre",
      amount: "$3.784.500,30",
    });

    const inFavor = viewOf(figuresOf(bancolombia(430_000_000)));
    expect(inFavor.debt).toEqual({
      label: "Saldo a favor al 10 de septiembre",
      amount: "$15.499,70",
    });
  });

  it("says when nothing is due", () => {
    const nothingDue = preparedCardSchema.parse({ ...NU, dueDate: undefined });
    expect(viewOf(figuresOf(nothingDue)).due).toEqual({
      label: "No tienes pagos pendientes.",
      payments: [],
    });
  });

  it("shows the latest that reconciles, and says when a statement of the period doesn't", () => {
    const october = figuresOf(
      bancolombia(0),
      { from: "2026-09-11", to: "2026-10-10", isVerified: false },
      -1_000_000,
    );
    const view = viewOf(figuresOf(NU), october);

    expect(view.debt?.label).toBe("Deuda al 11 de septiembre");
    expect(view.status).toEqual({
      tone: "attention",
      title: "Tu extracto no cuadra por $10.000",
      detail: "Revisa el archivo",
    });
    expect(viewOf({ ...october, differenceMinor: null }).status.title).toBe(
      "Tu extracto no cuadra",
    );
  });

  it("shows its rate for purchases against the usury of the month its statement closed in (12.4b)", () => {
    const rateIn = (card: PreparedCard) =>
      yourCardView({
        account: NU_CARD,
        cardFigures: [figuresOf(card)],
        usuryRates: SEPTEMBER_USURY,
      }).rate;

    expect(
      rateIn(
        preparedCardSchema.parse({
          ...bancolombia(0),
          purchaseRatePpm: 19_000,
        }),
      ),
    ).toEqual({
      line: "Tasa de compras: 1,90% al mes, 25,34% efectivo anual.",
      usury: {
        isAbove: false,
        line: "Por debajo de la usura de sep 2026: 28,34% efectivo anual.",
      },
    });
    // The highest Nu prints on its purchases.
    expect(rateIn(nuWithRates(18_000, 21_000))?.usury).toEqual({
      isAbove: false,
      line: "En el tope de la usura de sep 2026: 28,34% efectivo anual.",
    });
    expect(rateIn(nuWithRates(21_100))).toEqual({
      line: "Tasa de compras: 2,11% al mes, 28,48% efectivo anual.",
      usury: {
        isAbove: true,
        line: "Esta tasa pasa la usura de sep 2026: 28,34% efectivo anual. Por ley no puede cobrar más: pídele a tu banco que la revise.",
      },
    });
  });

  it("shows the rate alone without its month's usury, and none when its statement prints none", () => {
    expect(viewOf(figuresOf(nuWithRates(20_500))).rate).toEqual({
      line: "Tasa de compras: 2,05% al mes, 27,57% efectivo anual.",
    });
    expect(
      yourCardView({
        account: NU_CARD,
        cardFigures: [figuresOf(bancolombia(0))],
        usuryRates: SEPTEMBER_USURY,
      }),
    ).not.toHaveProperty("rate");
  });

  it("shows no figures without a statement that reconciles", () => {
    expect(viewOf()).toEqual({
      figures: [],
      account: "Tarjeta de crédito · Nu ••••5678",
      status: {
        tone: "none",
        title: "Sin extracto de este mes",
        detail: "Con él vemos tu deuda y tu pago.",
      },
    });
  });
});

describe("summaryTitle", () => {
  it("names a card's summary apart", () => {
    expect(summaryTitle(NU_CARD)).toBe("Resumen de tu tarjeta");
    expect(summaryTitle({ ...NU_CARD, accountType: "savings" })).toBe(
      "Resumen de tu cuenta de ahorros",
    );
  });
});
