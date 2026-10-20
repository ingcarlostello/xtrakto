import {
  amountMinorSchema,
  type CalendarMonth,
  type ChannelId,
  localDateSchema,
  type RecurringPayment,
} from "@xtrakto/core";
import { describe, expect, it } from "vitest";
import { paymentsCalendar } from "./recurring-calendar.helpers";
import type { PaymentsCalendarView } from "./recurring-calendar.types";

const amount = (value: number) => amountMinorSchema.parse(value);
const date = (value: string) => localDateSchema.parse(value);
const month = (value: number, year = 2026): CalendarMonth => ({
  year,
  month: value,
});
const SEPTEMBER = month(9);
const OCTOBER = month(10);
// A Tuesday.
const TODAY = date("2026-10-20");

// A payment of `amountMinor` in each of its months, on its days.
const payment = ({
  label,
  first,
  last = first,
  months,
  amountMinor = -11_000_000,
  channels = ["pse"],
}: {
  label: string;
  first: number;
  last?: number;
  months: readonly number[];
  amountMinor?: number;
  channels?: readonly ChannelId[];
}): RecurringPayment => ({
  label,
  referenceLast4: null,
  bankTexts: [`PAGO PSE ${label}`],
  categoryId: "utilities",
  channels,
  months: months.map((value) => ({
    month: month(value),
    amountMinor: amount(amountMinor),
    payments: [amount(amountMinor)],
  })),
  typicalAmountMinor: amount(amountMinor),
  days: { first, last },
  lastDate: date(`2026-${String(months.at(-1)).padStart(2, "0")}-01`),
  trend: { kind: "stable" },
});

// Paid already in October, on the 2nd to the 4th.
const LOAN = payment({
  label: "Financiera Andes S",
  first: 2,
  last: 4,
  months: [8, 9, 10],
});
// Due on the 5th, not in October yet.
const INTERNET = payment({
  label: "HOGAR CONECTADO SA",
  first: 5,
  months: [7, 8, 9],
  amountMinor: -12_990_000,
});
// Due from the 18th to the 22nd, not in October yet; its typical month was
// less than its latest.
const GAS: RecurringPayment = {
  ...payment({
    label: "GAS NATURAL CIUDAD",
    first: 18,
    last: 22,
    months: [7, 8, 9],
    amountMinor: -3_099_000,
    channels: ["transfer", "pse"],
  }),
  typicalAmountMinor: amount(-2_800_000),
};
// Due on the 25th, after today.
const PHONE = payment({
  label: "Telefonia Movil",
  first: 25,
  months: [7, 8, 9],
});

const dayIn = (view: PaymentsCalendarView | undefined, day: number) =>
  view?.weeks.flat().find((cell) => cell?.day === day);

describe("paymentsCalendar", () => {
  it("shows this month while the page's month is this one or the one before", () => {
    const thisMonth = paymentsCalendar([LOAN], {
      month: OCTOBER,
      today: TODAY,
    });
    const lastMonth = paymentsCalendar([LOAN], {
      month: SEPTEMBER,
      today: TODAY,
    });

    expect(thisMonth?.title).toBe("Octubre");
    expect(lastMonth?.title).toBe("Octubre");
    expect(lastMonth?.subtitle).toBe(
      "Cuándo sale cada pago. Hoy es 20 de octubre.",
    );
  });

  it("shows nothing for an older month, a later one, or without fixed payments", () => {
    expect(
      paymentsCalendar([LOAN], { month: month(8), today: TODAY }),
    ).toBeUndefined();
    expect(
      paymentsCalendar([LOAN], { month: month(11), today: TODAY }),
    ).toBeUndefined();
    expect(
      paymentsCalendar([], { month: OCTOBER, today: TODAY }),
    ).toBeUndefined();
  });

  it("lays out the month from Monday, with each payment's days and today", () => {
    const view = paymentsCalendar([LOAN, INTERNET, GAS], {
      month: OCTOBER,
      today: TODAY,
    });

    expect(view?.weeks[0]?.slice(0, 4)).toEqual([
      null,
      null,
      null,
      { day: 1, isInRange: false, isFixedDay: false, isToday: false },
    ]);
    expect(dayIn(view, 3)).toMatchObject({
      isInRange: true,
      isFixedDay: false,
    });
    expect(dayIn(view, 5)).toMatchObject({
      isInRange: false,
      isFixedDay: true,
    });
    expect(dayIn(view, 20)).toEqual({
      day: 20,
      isInRange: true,
      isFixedDay: false,
      isToday: true,
    });
    expect(dayIn(view, 23)).toMatchObject({ isInRange: false, isToday: false });
  });

  it("puts the days past the month's end on its last day", () => {
    const late = payment({
      label: "Arriendo",
      first: 30,
      last: 31,
      months: [11, 12],
    });

    const view = paymentsCalendar([late], {
      month: month(1, 2027),
      today: date("2027-02-10"),
    });

    expect(view?.title).toBe("Febrero");
    expect(dayIn(view, 28)).toMatchObject({
      isInRange: false,
      isFixedDay: true,
    });
  });

  it("says which payments of this month haven't appeared though their days began, the earliest first", () => {
    const view = paymentsCalendar([GAS, PHONE, LOAN, INTERNET], {
      month: OCTOBER,
      today: TODAY,
    });

    expect(view?.pending).toEqual([
      {
        key: "HOGAR CONECTADO SA-",
        title: "Pendiente: HOGAR CONECTADO SA, el 5.",
        detail: "Aún no aparece. Unos $130 mil, por PSE.",
      },
      {
        key: "GAS NATURAL CIUDAD-",
        title: "Pendiente: GAS NATURAL CIUDAD, del 18 al 22.",
        detail: "Aún no aparece. Unos $31 mil, por transferencia o PSE.",
      },
    ]);
    expect(view?.note).toBeUndefined();
  });

  it("says nothing is pending once this month's payments appeared", () => {
    const view = paymentsCalendar([LOAN, PHONE], {
      month: OCTOBER,
      today: TODAY,
    });

    expect(view?.pending).toEqual([]);
    expect(view?.note).toBe("Nada pendiente hasta hoy.");
  });

  it("says nothing of what's pending without this month's movements", () => {
    const view = paymentsCalendar([INTERNET, GAS], {
      month: SEPTEMBER,
      today: TODAY,
    });

    expect(view?.pending).toEqual([]);
    expect(view?.note).toBeUndefined();
  });

  it("tells a screen reader each payment's days, the earliest first", () => {
    expect(
      paymentsCalendar([GAS, LOAN, INTERNET], { month: OCTOBER, today: TODAY })
        ?.label,
    ).toBe(
      "Cuándo sale cada pago en octubre: Financiera Andes S, del 2 al 4; HOGAR CONECTADO SA, el 5; GAS NATURAL CIUDAD, del 18 al 22.",
    );
  });
});
