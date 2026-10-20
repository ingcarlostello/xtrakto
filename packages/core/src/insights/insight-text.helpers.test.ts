import { describe, expect, it } from "vitest";
import { localDateSchema, periodSchema } from "../dates/date.schemas";
import { amountMinorSchema } from "../money/money.schemas";
import type { RecurringPayment } from "../recurring/recurring.types";
import { insightText } from "./insight-text.helpers";

const amount = (value: number) => amountMinorSchema.parse(value);
const period = (from: string, to: string) => periodSchema.parse({ from, to });
const total = (amountMinor: number, count: number) => ({
  amountMinor: amount(amountMinor),
  count,
});
const paid = (month: number, amountMinor: number) => ({
  month: { year: 2026, month },
  amountMinor: amount(amountMinor),
  payments: [amount(amountMinor)],
});

const ENERGY: RecurringPayment = {
  label: "EMPRESA DE ENERGIA",
  referenceLast4: null,
  bankTexts: ["PAGO PSE EMPRESA DE ENERGIA"],
  categoryId: "utilities",
  channels: ["pse"],
  months: [paid(7, -16_230_000), paid(8, -17_000_000), paid(9, -18_200_000)],
  typicalAmountMinor: amount(-17_000_000),
  days: { first: 14, last: 16 },
  lastDate: localDateSchema.parse("2026-09-15"),
  trend: { kind: "rose", percent: 12 },
};

describe("insightText", () => {
  it("says when the 4x1000 was charged and to check the exemption", () => {
    expect(
      insightText({
        kind: "gmf_tax",
        total: total(-1_976_000, 9),
        days: period("2026-07-10", "2026-07-18"),
      }),
    ).toEqual({
      title: "Te cobraron 4x1000",
      note: "Del 10 al 18 de julio, en 9 cobros. Revisa si tu cuenta es exenta.",
      needsAttention: true,
    });
  });

  it("says a 4x1000 charged once", () => {
    expect(
      insightText({
        kind: "gmf_tax",
        total: total(-480_000, 1),
        days: period("2026-07-10", "2026-07-10"),
      }).note,
    ).toBe("El 10 de julio, en 1 cobro. Revisa si tu cuenta es exenta.");
  });

  it.each([
    { rate: 0.05037, text: "Un 0,05%" },
    { rate: 1.5, text: "Un 1,5%" },
    { rate: 0.004, text: "Menos del 0,01%" },
  ])("writes a yield of $rate% as $text", ({ rate, text }) => {
    expect(
      insightText({
        kind: "savings_yield",
        interestMinor: amount(132_000),
        averageBalanceMinor: amount(1_040_000_000),
        annualRatePercent: rate,
      }),
    ).toEqual({
      title: "Intereses de tu ahorro",
      note: `${text} efectivo anual sobre tu saldo promedio de $10,4M.`,
      needsAttention: false,
    });
  });

  it.each([
    { count: 17, title: "17 retiros de efectivo" },
    { count: 1, title: "1 retiro de efectivo" },
  ])("counts the cash withdrawn: $title", ({ count, title }) => {
    expect(
      insightText({ kind: "cash", total: total(-315_000_000, count) }),
    ).toEqual({
      title,
      note: "No sabemos en qué se usó.",
      needsAttention: false,
    });
  });

  it("asks to name the payments through gateways", () => {
    expect(
      insightText({ kind: "payment_gateways", total: total(-60_000_000, 6) }),
    ).toEqual({
      title: "6 pagos sin tienda identificada",
      note: "Pasaron por pasarelas de pago y el banco no dice dónde compraste: elige su categoría en Movimientos.",
      needsAttention: true,
    });
  });

  it("says since when a new fixed payment repeats, on its day or its days", () => {
    const gym = {
      ...ENERGY,
      label: "GIMNASIO FIT",
      days: { first: 10, last: 10 },
    };
    const since = { year: 2026, month: 7 };

    expect(insightText({ kind: "new_recurring", payment: gym, since })).toEqual(
      {
        title: "Nuevo pago fijo: GIMNASIO FIT",
        note: "Se repite desde julio, el día 10.",
        needsAttention: false,
      },
    );
    expect(
      insightText({ kind: "new_recurring", payment: ENERGY, since }).note,
    ).toBe("Se repite desde julio, entre el 14 y el 16.");
  });

  it("says how much a fixed payment rose, from its first month to its last", () => {
    expect(
      insightText({
        kind: "recurring_rose",
        payment: ENERGY,
        percent: 12,
        from: paid(7, -16_230_000),
        to: paid(9, -18_200_000),
        riseMinor: amount(1_970_000),
      }),
    ).toEqual({
      title: "EMPRESA DE ENERGIA subió 12%",
      note: "De $162.300 en julio a $182.000 en septiembre. Revisa tu consumo o la tarifa.",
      needsAttention: true,
    });
  });

  it("names a Nequi number by its channel", () => {
    const send: RecurringPayment = {
      ...ENERGY,
      label: "TRANSFERENCIAS A NEQUI",
      referenceLast4: "1270",
      channels: ["nequi"],
    };

    expect(
      insightText({
        kind: "new_recurring",
        payment: send,
        since: { year: 2026, month: 7 },
      }).title,
    ).toBe("Nuevo pago fijo: Nequi ••• 1270");
  });
});
