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
  listFilters,
  listSubtitle,
  monthBars,
  monthTotal,
  noneText,
  pageSubtitle,
  recurringHrefOf,
  recurringTiles,
  rowView,
  viewOf,
} from "./recurring-view.helpers";
import type { AccountRecurring } from "./recurring.types";

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

  it("says the payments that stopped don't appear in the page's month", () => {
    expect(listSubtitle(SEPTEMBER, "stopped")).toBe(
      "Se repetían cada mes, pero no aparecen en septiembre. Las barras muestran julio, agosto y septiembre.",
    );
    expect(noneText(SEPTEMBER)).toBe("No hay pagos fijos en septiembre.");
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

  it("says a payment still expected hasn't come in the page's month, with its latest amount", () => {
    const row = rowView(LOAN, month(10));

    expect(row).toMatchObject({
      note: "Aún no aparece en octubre.",
      amount: "−$1.851.000",
    });
    expect(row.installmentsText).toBeUndefined();
  });

  it("says when a payment that stopped was last paid", () => {
    expect(rowView(ENERGY, month(11), "stopped")).toMatchObject({
      note: "Último pago el 3 de septiembre.",
      amount: "−$182.000",
    });
  });
});

describe("recurringTiles", () => {
  const roseLabel = (spending: readonly RecurringPayment[]) =>
    recurringTiles(spending).find(({ kind }) => kind === "rose")?.label;

  it("adds up each fixed payment's latest month, a month and a year, and shows the one that rose", () => {
    expect(recurringTiles([LOAN, ENERGY])).toEqual([
      {
        kind: "monthly",
        label: "Pagas al mes",
        amount: "$2,0M",
        caption: "Sale de tu cuenta aunque no hagas nada.",
      },
      {
        kind: "yearly",
        label: "Al año",
        amount: "$24,4M",
        caption: "Lo que suman estos 2 pagos en 12 meses.",
      },
      {
        kind: "rose",
        categoryId: "utilities",
        label: "Electrificadora de subió 12%",
        amount: "+$17.000",
        caption:
          "De $165.000 en agosto a $182.000 en septiembre. Revisa tu consumo o la tarifa.",
      },
    ]);
  });

  it("speaks of one payment, and shows no rise when none rose", () => {
    expect(
      recurringTiles([LOAN]).map(({ kind, caption }) => ({ kind, caption })),
    ).toEqual([
      { kind: "monthly", caption: "Sale de tu cuenta aunque no hagas nada." },
      { kind: "yearly", caption: "Lo que suma este pago en 12 meses." },
    ]);
  });

  it("shows nothing without fixed payments", () => {
    expect(recurringTiles([])).toEqual([]);
  });

  it("shows the payment that rose the most, then the one that rose the most money", () => {
    const water: RecurringPayment = {
      ...ENERGY,
      label: "Acueducto Municipa",
      trend: { kind: "rose", percent: 20 },
    };
    const gas: RecurringPayment = {
      ...ENERGY,
      label: "GAS NATURAL CIUDAD",
      months: [paid(8, [-16_500_000]), paid(9, [-18_400_000])],
    };

    expect(roseLabel([ENERGY, water])).toBe("Acueducto Municipa subió 20%");
    expect(roseLabel([ENERGY, gas])).toBe("GAS NATURAL CIUDAD subió 12%");
  });
});

describe("the list's chips", () => {
  const ACCOUNT = {
    id: "0d3c8f4e-6a1b-4c2d-9e8f-7a6b5c4d3e2f",
    bankId: "bancolombia",
    accountType: "savings",
    last4: "8901",
  } as const;
  const THIRD_QUARTER = { kind: "quarter", year: 2026, quarter: 3 } as const;
  const recurring = (
    changes: Partial<AccountRecurring> = {},
  ): AccountRecurring => ({
    accounts: [ACCOUNT],
    account: ACCOUNT,
    quarters: [],
    period: THIRD_QUARTER,
    month: SEPTEMBER,
    payments: { spending: [LOAN, ENERGY], moved: [CARD] },
    stopped: [SEND],
    ...changes,
  });

  it("shows the payments that stopped only when the URL asks and some did", () => {
    expect(viewOf("stopped", [SEND])).toBe("stopped");
    expect(viewOf("stopped", [])).toBe("active");
    expect(viewOf(undefined, [SEND])).toBe("active");
  });

  it("offers the payments expected and those that stopped, as links, the shown one current", () => {
    expect(listFilters(recurring(), "stopped")).toEqual([
      {
        label: "Activos · 2",
        href: { pathname: "/recurring", query: { period: "2026-q3" } },
        isCurrent: false,
      },
      {
        label: "Ya no aparecen · 1",
        href: {
          pathname: "/recurring",
          query: { period: "2026-q3", filter: "stopped" },
        },
        isCurrent: true,
      },
    ]);
  });

  it("keeps the account in the chips' links only with several", () => {
    const other = { ...ACCOUNT, id: "5b9e2a71-3c4d-4e5f-8a9b-0c1d2e3f4a5b" };

    expect(
      listFilters(recurring({ accounts: [ACCOUNT, other] }), "active")[0],
    ).toEqual({
      label: "Activos · 2",
      href: {
        pathname: "/recurring",
        query: { account: ACCOUNT.id, period: "2026-q3" },
      },
      isCurrent: true,
    });
  });

  it("offers no chips when nothing stopped", () => {
    expect(listFilters(recurring({ stopped: [] }), "active")).toEqual([]);
  });

  it("keeps the payments that stopped in the links to another period", () => {
    expect(recurringHrefOf("stopped")({ period: THIRD_QUARTER })).toEqual({
      pathname: "/recurring",
      query: { period: "2026-q3", filter: "stopped" },
    });
    expect(recurringHrefOf("active")({ period: THIRD_QUARTER })).toEqual({
      pathname: "/recurring",
      query: { period: "2026-q3" },
    });
  });
});
