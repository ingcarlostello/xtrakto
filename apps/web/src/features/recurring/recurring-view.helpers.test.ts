import {
  amountMinorSchema,
  type CalendarMonth,
  localDateSchema,
  type RecurringPayment,
} from "@xtrakto/core";
import { describe, expect, it } from "vitest";
import {
  barMonths,
  foundText,
  listSubtitle,
  monthBars,
  monthTotal,
  pageSubtitle,
  rowView,
} from "./recurring-view.helpers";

const amount = (value: number) => amountMinorSchema.parse(value);
const month = (value: number, year = 2026): CalendarMonth => ({
  year,
  month: value,
});
const SEPTEMBER = month(9);

// A month's payments: their total, and each one.
const paid = (value: number, payments: readonly number[]) => ({
  month: month(value),
  amountMinor: amount(payments.reduce((sum, each) => sum + each, 0)),
  payments: payments.map(amount),
});

const LOAN: RecurringPayment = {
  label: "Financiera Andes S",
  referenceLast4: null,
  bankTexts: ["PAGO PSE Financiera Andes S"],
  categoryId: "loan_payment",
  channels: ["pse"],
  months: [7, 8, 9].map((value) => paid(value, [-154_000_000, -31_100_000])),
  typicalAmountMinor: amount(-185_100_000),
  days: { first: 1, last: 4 },
  lastDate: localDateSchema.parse("2026-09-03"),
  trend: { kind: "stable" },
};

const ENERGY: RecurringPayment = {
  ...LOAN,
  label: "Electrificadora de",
  bankTexts: ["PAGO PSE Electrificadora de", "PAGO PSE Electrificadora de S"],
  categoryId: "utilities",
  months: [paid(8, [-16_500_000]), paid(9, [-18_200_000])],
  typicalAmountMinor: amount(-16_500_000),
  days: { first: 15, last: 15 },
  trend: { kind: "rose", percent: 12 },
};

const SEND: RecurringPayment = {
  ...LOAN,
  label: "TRANSFERENCIAS A NEQUI",
  referenceLast4: "1270",
  bankTexts: ["TRANSFERENCIAS A NEQUI"],
  categoryId: "transfers_to_people",
  channels: ["nequi"],
  months: [7, 8, 9].map((value) => paid(value, [-5_000_000, -2_000_000])),
};

const CARD: RecurringPayment = {
  ...LOAN,
  label: "TC MASTER PESOS",
  bankTexts: ["PAGO SUC VIRT TC MASTER PESOS"],
  categoryId: "credit_card_payment",
  channels: ["virtual_branch", "pse"],
  months: [
    paid(7, [-4_800_000]),
    paid(8, [-209_000_000]),
    paid(9, [-120_000_000]),
  ],
  typicalAmountMinor: amount(-120_000_000),
  trend: { kind: "variable" },
};

describe("the page's texts", () => {
  it.each([
    [
      [LOAN, ENERGY],
      [CARD],
      "Encontramos 2 gastos fijos y 1 pago que se repite pero no es gasto.",
    ],
    [[LOAN], [], "Encontramos 1 gasto fijo."],
    [[], [CARD, CARD], "Encontramos 2 pagos que se repiten pero no son gasto."],
  ])("says what it found", (spending, moved, text) => {
    expect(foundText({ spending, moved })).toBe(text);
  });

  it("says only what repeats when it found nothing", () => {
    expect(pageSubtitle({ spending: [], moved: [] })).toBe(
      "Lo que se repite cada mes.",
    );
  });

  it("shows the three months that end with the page's, across a new year", () => {
    expect(barMonths(month(2, 2027))).toEqual([
      month(12),
      month(1, 2027),
      month(2, 2027),
    ]);
    expect(listSubtitle(SEPTEMBER)).toBe(
      "Ordenados por monto. Las barras muestran julio, agosto y septiembre.",
    );
  });

  it("adds up the month's fixed payments", () => {
    expect(monthTotal([LOAN, ENERGY], SEPTEMBER)).toEqual({
      label: "Total en septiembre",
      amount: "−$2.033.000",
    });
  });
});

describe("monthBars", () => {
  it("draws each month against the most of the three, the page's darker", () => {
    expect(monthBars(ENERGY, SEPTEMBER)).toEqual([
      {
        key: "2026-7",
        label: "jul",
        text: "Julio sin pago",
        heightPercent: 0,
        isShown: false,
      },
      {
        key: "2026-8",
        label: "ago",
        text: "Agosto $165.000",
        heightPercent: 91,
        isShown: false,
      },
      {
        key: "2026-9",
        label: "sep",
        text: "Septiembre $182.000",
        heightPercent: 100,
        isShown: true,
      },
    ]);
  });

  it("measures the bars against the most of the three, whichever month it is", () => {
    expect(
      monthBars(CARD, SEPTEMBER).map(({ heightPercent }) => heightPercent),
    ).toEqual([2, 100, 57]);
  });
});

describe("rowView", () => {
  it("reads a loan in two installments, stable", () => {
    expect(rowView(LOAN, SEPTEMBER)).toEqual({
      key: "Financiera Andes S--loan_payment",
      categoryId: "loan_payment",
      title: "Financiera Andes S",
      bankText: "PAGO PSE Financiera Andes S",
      installmentsText: "2 cuotas: $1.540.000 y $311.000.",
      cadence: "Mensual · entre el 1 y el 4",
      channels: ["PSE"],
      trend: { label: "Estable", variant: "ok" },
      hasSeveralChannels: false,
      amount: "−$1.851.000",
    });
  });

  it("reads a bill the bank wrote two ways, on one day, that rose", () => {
    const row = rowView(ENERGY, SEPTEMBER);

    expect(row).toMatchObject({
      alsoText: "También: “PAGO PSE Electrificadora de S”.",
      cadence: "Mensual · día 15",
      trend: { label: "Subió 12%", variant: "spending" },
      amount: "−$182.000",
    });
    // One payment in its month: no installments.
    expect(row.installmentsText).toBeUndefined();
  });

  it("names a Nequi number by its channel, and its sends as payments", () => {
    expect(rowView(SEND, SEPTEMBER)).toMatchObject({
      title: "Nequi ••• 1270",
      installmentsText: "2 pagos: $50.000 y $20.000.",
    });
  });

  it("shows the range of an amount that moves a lot, and its channels", () => {
    expect(rowView(CARD, SEPTEMBER)).toMatchObject({
      channels: ["Sucursal virtual", "PSE"],
      hasSeveralChannels: true,
      trend: { label: "Monto variable", variant: "neutral" },
      amount: "$48.000 a $2.090.000",
    });
  });
});
