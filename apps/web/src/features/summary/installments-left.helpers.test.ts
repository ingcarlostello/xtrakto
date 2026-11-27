import {
  amountMinorSchema,
  localDateSchema,
  periodSchema,
  summarizeMovements,
} from "@xtrakto/core";
import type { AccountRow, CardPurchase } from "@xtrakto/db";
import { describe, expect, it } from "vitest";
import type { InstallmentLeft } from "@/features/cards/card-installments.types";
import { installmentsLeftView } from "./installments-left.helpers";
import type { AccountSummary } from "./summary.types";

const NU_CARD: AccountRow = {
  id: "a1",
  bankId: "nu",
  accountType: "credit_card",
  last4: "1234",
};
const SAVINGS: AccountRow = {
  id: "a2",
  bankId: "bancolombia",
  accountType: "savings",
  last4: "8901",
};
// Nu's September and October.
const CYCLES = [
  periodSchema.parse({ from: "2026-08-12", to: "2026-09-10" }),
  periodSchema.parse({ from: "2026-09-11", to: "2026-10-10" }),
];

const purchaseOf = (id: string, date: string, text: string): CardPurchase => ({
  id,
  date: localDateSchema.parse(date),
  descriptionRaw: text,
  amountMinor: amountMinorSchema.parse(-120_000_000),
  balanceAfterMinor: null,
  categoryId: "other_spending",
  categoryRuleId: "unknown_merchant",
  isPendingReview: false,
  llmTitle: null,
  fingerprint: id.padEnd(64, "0"),
});

// What October's statement charged of it.
const leftOf = (
  purchase: CardPurchase,
  [number, count, remaining]: readonly [number, number, number?],
): InstallmentLeft => ({
  purchase,
  installment: {
    fingerprint: purchase.fingerprint,
    number,
    count,
    monthlyMinor: amountMinorSchema.parse(5_000_000),
    ...(remaining === undefined
      ? {}
      : { remainingMinor: amountMinorSchema.parse(remaining) }),
    closedOn: localDateSchema.parse("2026-10-10"),
    bank: "nu",
  },
});

const ORDER = leftOf(
  purchaseOf("b1", "2026-08-20", "Pedido *****6789"),
  [2, 24, 110_000_000],
);
const CLOTHES = leftOf(
  purchaseOf("b2", "2026-07-15", "Almacen Ropa"),
  [3, 6, 30_000_000],
);

// A card's summary of October, the user with a savings account too.
const summaryWith = (
  purchases: readonly InstallmentLeft[] | null,
): AccountSummary => ({
  accounts: [SAVINGS, NU_CARD],
  account: NU_CARD,
  quarters: [],
  cycles: CYCLES,
  years: [],
  period: { kind: "month", year: 2026, month: 10 },
  movements: [],
  summary: summarizeMovements([]),
  fixedPayments: [],
  balance: null,
  balances: null,
  bankFigures: [],
  cardFigures: [],
  usuryRates: new Map(),
  installmentsLeft:
    purchases === null
      ? null
      : { closedOn: localDateSchema.parse("2026-10-10"), purchases },
  unreconciled: [],
  missingMonths: [],
});

describe("installmentsLeftView", () => {
  it("lists what the latest statement still charges, each with what's left and until when, and their total", () => {
    const view = installmentsLeftView(summaryWith([ORDER, CLOTHES]));

    expect(view?.subtitle).toBe("Según tu extracto de oct 2026.");
    expect(view?.total).toBe("Te faltan $1.400.000 en 2 compras.");
    expect(view?.rows[0]).toEqual({
      id: "b1",
      categoryId: "other_spending",
      tone: "spending",
      title: "Compra en un comercio",
      isBankText: false,
      bankText: "Pedido *****6789",
      note: "Cuota 2 de 24 · $50.000 al mes",
      left: "$1.100.000",
      until: "hasta ago 2028",
      // Its detail in its own cycle, September's.
      href: {
        pathname: "/transactions",
        query: { account: "a1", period: "2026-09", movement: "b1" },
      },
    });
    expect(view?.rows[1]?.until).toBe("hasta ene 2027");
  });

  it("draws a balance transfer as a debt that only moved", () => {
    const transfer = leftOf(
      {
        ...purchaseOf("b3", "2026-03-10", "COMPRA DE CARTERA Y/O D"),
        categoryId: "credit_card_payment",
        categoryRuleId: "card_balance_transfer",
      },
      [7, 30, 230_000_000],
    );

    expect(installmentsLeftView(summaryWith([transfer]))?.rows[0]?.tone).toBe(
      "moved",
    );
  });

  it("counts the purchases when a statement prints no amount left, and says when nothing is left", () => {
    const unprinted = leftOf(ORDER.purchase, [2, 24]);

    expect(
      installmentsLeftView(summaryWith([unprinted, CLOTHES])),
    ).toMatchObject({
      total: "Te faltan cuotas de 2 compras.",
      rows: [{ left: "22 cuotas" }, { left: "$300.000" }],
    });
    expect(installmentsLeftView(summaryWith([]))).toEqual({
      subtitle: "Según tu extracto de oct 2026.",
      total: "No tienes compras a cuotas por pagar.",
      rows: [],
    });
  });

  it("shows nothing without a statement that reconciles, or on another account", () => {
    expect(installmentsLeftView(summaryWith(null))).toBeNull();
  });
});
