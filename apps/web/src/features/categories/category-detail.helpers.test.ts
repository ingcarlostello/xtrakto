import {
  amountMinorSchema,
  type CategorizationRuleId,
  type CategoryId,
  localDateSchema,
  summarizeMovements,
  type UserCategoryRule,
} from "@xtrakto/core";
import type {
  AccountRow,
  PeriodMovement,
  TransactionListItem,
} from "@xtrakto/db";
import { describe, expect, it } from "vitest";
import type { MovementPeriod } from "@/utils/transactions-url.helpers";
import {
  categorySettings,
  categoryTiles,
  detailSubtitle,
  latestFooter,
  latestRows,
  latestSubtitle,
  monthBoxes,
  spendingCategoryOf,
} from "./category-detail.helpers";

const QUARTER: MovementPeriod = { kind: "quarter", year: 2026, quarter: 3 };
const AUGUST: MovementPeriod = { kind: "month", year: 2026, month: 8 };

type Row = readonly [
  date: string,
  amount: number,
  text: string,
  as: readonly [CategoryId, CategorizationRuleId],
];

const movement = ([date, amount, text, [categoryId, rule]]: Row) =>
  ({
    date: localDateSchema.parse(date),
    amountMinor: amountMinorSchema.parse(amount),
    balanceAfterMinor: null,
    descriptionRaw: text,
    referenceHash: null,
    referenceLast4: null,
    categoryId,
    categoryRuleId: rule,
  }) satisfies PeriodMovement;

const FOOD = ["restaurants", "merchant_restaurants"] as const;
const CASH = ["cash_withdrawal", "cash_withdrawal"] as const;
const SALARY = ["income_transfer", "interbank_in"] as const;

const DELIVERY: Row = [
  "2026-07-03",
  -4_890_000,
  "COMPRA EN  APP DOMICILIOS",
  FOOD,
];
const LUNCH: Row = [
  "2026-08-05",
  -18_600_000,
  "COMPRA EN  REST EL FOGON",
  FOOD,
];
const QR_DELIVERY: Row = [
  "2026-08-12",
  -3_650_000,
  "PAGO QR APP DOMICIL",
  FOOD,
];
const COFFEE: Row = ["2026-09-16", -1_840_000, "PAGO QR CAFE LA ESQUIN", FOOD];

// v8-06's quarter, in short: restaurants beside a withdrawal and a salary.
const ROWS: readonly Row[] = [
  DELIVERY,
  ["2026-07-10", 320_000_000, "PAGO INTERBANC EMPRESA EJEMPLO", SALARY],
  ["2026-07-20", -30_000_000, "RETIRO CAJERO  ATM PLAZA CENTR", CASH],
  LUNCH,
  QR_DELIVERY,
  COFFEE,
];

type Shown = { period?: MovementPeriod; categoryId?: CategoryId };

// A category's period as its detail reads it, without its newest movements.
const detailOf = (
  rows: readonly Row[],
  { period = QUARTER, categoryId = "restaurants" }: Shown = {},
) => {
  const movements = rows.map(movement);
  return {
    period,
    categoryId,
    movements,
    summary: summarizeMovements(movements),
  };
};

describe("spendingCategoryOf", () => {
  it("finds a category of real spending, and nothing else", () => {
    expect(spendingCategoryOf("restaurants")).toBe("restaurants");
    expect(spendingCategoryOf("interest")).toBeUndefined();
    expect(spendingCategoryOf("investment")).toBeUndefined();
    expect(spendingCategoryOf("Restaurantes")).toBeUndefined();
  });
});

describe("detailSubtitle", () => {
  it("says the kind and the period in words", () => {
    expect(detailSubtitle(QUARTER)).toBe(
      "Gasto real · julio a septiembre de 2026",
    );
    expect(detailSubtitle(AUGUST)).toBe("Gasto real · agosto de 2026");
  });
});

describe("categoryTiles", () => {
  it("adds up the category, says its share, its average to the peso and its largest, and each month", () => {
    expect(categoryTiles(detailOf(ROWS))).toEqual({
      total: {
        label: "Total del trimestre",
        amount: "$289.800",
        note: "4 movimientos · 49% de tu gasto real.",
      },
      average: {
        label: "Promedio por movimiento",
        amount: "$72.450",
        note: "El más alto: $186.000, el 5 de agosto.",
      },
      months: [
        { key: "2026-07", label: "Julio", amount: "$49 mil", isMost: false },
        { key: "2026-08", label: "Agosto", amount: "$223 mil", isMost: true },
        {
          key: "2026-09",
          label: "Septiembre",
          amount: "$18 mil",
          isMost: false,
        },
      ],
    });
  });

  it("names a month's total and shows no months", () => {
    const august = ROWS.filter(([date]) => date.startsWith("2026-08"));

    expect(categoryTiles(detailOf(august, { period: AUGUST }))).toMatchObject({
      total: { label: "Total de agosto", amount: "$222.500" },
      months: [],
    });
  });

  it("writes a million or more compact, and says when there was only one", () => {
    const tiles = categoryTiles(
      detailOf([["2026-08-10", -150_000_000, "RETIRO CAJERO CENTRO", CASH]], {
        categoryId: "cash_withdrawal",
      }),
    );

    expect(tiles?.total).toEqual({
      label: "Total del trimestre",
      amount: "$1,5M",
      note: "1 movimiento · 100% de tu gasto real.",
    });
    expect(tiles?.average).toEqual({
      label: "Promedio por movimiento",
      amount: "$1,5M",
      note: "Un solo movimiento, el 10 de agosto.",
    });
  });

  it("writes the average to the peso", () => {
    const thirds: readonly Row[] = [
      ["2026-07-03", -400_000, "PAGO QR CAFE LA ESQUIN", FOOD],
      ["2026-07-09", -300_000, "PAGO QR CAFE DEL PARQUE", FOOD],
      ["2026-07-15", -300_000, "PAGO QR CAFE LA ESQUIN", FOOD],
    ];

    expect(categoryTiles(detailOf(thirds))?.average.amount).toBe("$3.333");
  });

  it("takes the first of the largest when two tie", () => {
    const tie: readonly Row[] = [
      ["2026-07-03", -2_000_000, "PAGO QR CAFE LA ESQUIN", FOOD],
      ["2026-07-09", -2_000_000, "PAGO QR CAFE DEL PARQUE", FOOD],
    ];

    expect(categoryTiles(detailOf(tie))?.average.note).toBe(
      "El más alto: $20.000, el 3 de julio.",
    );
  });

  it("shows nothing when the category took nothing in the period", () => {
    const others = ROWS.filter(
      ([, , , [categoryId]]) => categoryId !== "restaurants",
    );

    expect(categoryTiles(detailOf(others))).toBeUndefined();
    expect(latestSubtitle(detailOf(others))).toBe(
      "No hubo gasto en «Restaurantes y domicilios» en este periodo.",
    );
    expect(latestSubtitle(detailOf(ROWS))).toBe("Los más recientes primero.");
  });
});

describe("monthBoxes", () => {
  it("leaves out a month without movements, and says $0 for one without the category's", () => {
    const rows: readonly Row[] = [
      DELIVERY,
      ["2026-08-20", -30_000_000, "RETIRO CAJERO CENTRO", CASH],
    ];

    expect(monthBoxes(detailOf(rows))).toEqual([
      { key: "2026-07", label: "Julio", amount: "$49 mil", isMost: true },
      { key: "2026-08", label: "Agosto", amount: "$0", isMost: false },
    ]);
  });

  it("marks no month when there's only one", () => {
    const july = ROWS.filter(([date]) => date.startsWith("2026-07"));

    expect(monthBoxes(detailOf(july))).toEqual([
      { key: "2026-07", label: "Julio", amount: "$49 mil", isMost: false },
    ]);
  });
});

const ACCOUNT: AccountRow = {
  id: "a1",
  bankId: "bancolombia",
  accountType: "savings",
  last4: "8901",
};

const item = (
  id: string,
  [date, amount, text, [categoryId, rule]]: Row,
  isPendingReview = false,
): TransactionListItem => ({
  id,
  date: localDateSchema.parse(date),
  descriptionRaw: text,
  amountMinor: amountMinorSchema.parse(amount),
  balanceAfterMinor: null,
  categoryId,
  categoryRuleId: rule,
  isPendingReview,
  llmTitle: null,
});

// The category's detail with its newest movements, for one account or two.
const withLatest = (
  latest: readonly TransactionListItem[],
  accounts: readonly AccountRow[] = [ACCOUNT],
) => ({
  ...detailOf(ROWS),
  accounts,
  account: ACCOUNT,
  quarters: [{ year: 2026, quarter: 3, status: "verified" } as const],
  latest,
});

describe("latestRows", () => {
  it("shows each one's bank text, day, channel and amount, opening its detail among the category's", () => {
    const [row] = latestRows(withLatest([item("m1", COFFEE)]));

    expect(row).toEqual({
      id: "m1",
      title: "PAGO QR CAFE LA ESQUIN",
      hasDescription: true,
      date: "16 de septiembre",
      channel: "QR",
      isPendingReview: false,
      amount: "−$18.400",
      href: {
        pathname: "/transactions",
        query: { period: "2026-q3", category: "restaurants", movement: "m1" },
      },
    });
  });

  it("titles the bank's 0, says when it waits for review, and keeps the account when there are several", () => {
    const other = { ...ACCOUNT, id: "a2", last4: null };
    const [row] = latestRows(
      withLatest(
        [
          item(
            "m2",
            [
              "2026-08-01",
              -5_000_000,
              "0",
              ["other_spending", "no_description_out"],
            ],
            true,
          ),
        ],
        [ACCOUNT, other],
      ),
    );

    expect(row).toMatchObject({
      title: "Sin descripción del banco",
      hasDescription: false,
      channel: undefined,
      isPendingReview: true,
      href: {
        query: {
          account: "a1",
          period: "2026-q3",
          category: "restaurants",
          movement: "m2",
        },
      },
    });
  });
});

describe("latestFooter", () => {
  const newest = [item("m1", COFFEE), item("m2", QR_DELIVERY)];

  it("counts what shows out of the category's movements, and links to all of them", () => {
    expect(latestFooter(withLatest(newest))).toEqual({
      status: "Mostrando 2 de 4",
      label: "Ver los 4 movimientos",
      href: {
        pathname: "/transactions",
        query: { period: "2026-q3", category: "restaurants" },
      },
    });
  });

  it("links to a single movement, and to nothing without any", () => {
    const one = { ...withLatest(newest), movements: [movement(DELIVERY)] };

    expect(latestFooter(one)?.label).toBe("Ver en Movimientos");
    expect(latestFooter({ ...one, movements: [] })).toBeUndefined();
  });
});

describe("categorySettings", () => {
  const rule = (descriptionFolded: string): UserCategoryRule => ({
    target: "description",
    descriptionFolded,
    direction: "out",
    categoryId: "restaurants",
  });

  it("says what the category counts as, and that the user has no rules for it", () => {
    expect(categorySettings({ categoryId: "restaurants", rules: [] })).toEqual({
      countsAs: "Restaurantes y domicilios siempre suma a tu gasto real.",
      rulesTitle: "Sin reglas tuyas",
      rulesNote:
        "Las crean tus respuestas en la revisión y tus correcciones en Movimientos.",
      hasRules: false,
    });
  });

  it("names the user's rules for it, the texts first, then how many more", () => {
    const rules: readonly UserCategoryRule[] = [
      rule("PAGO QR APP DOMICIL"),
      {
        target: "reference",
        referenceHash: "h1",
        referenceLast4: "1270",
        categoryId: "restaurants",
      },
      rule("COMPRA EN APP DOMICILIOS"),
      rule("PAGO LLAVE COMIDAS RA"),
      rule("COMPRA EN REST EL FOGON"),
    ];

    expect(categorySettings({ categoryId: "restaurants", rules })).toEqual({
      countsAs: "Restaurantes y domicilios siempre suma a tu gasto real.",
      rulesTitle: "5 reglas tuyas",
      rulesNote:
        "COMPRA EN APP DOMICILIOS, COMPRA EN REST EL FOGON, PAGO LLAVE COMIDAS RA y 2 más",
      hasRules: true,
    });
    expect(
      categorySettings({ categoryId: "restaurants", rules: rules.slice(0, 1) }),
    ).toMatchObject({
      rulesTitle: "1 regla tuya",
      rulesNote: "PAGO QR APP DOMICIL",
    });
  });
});
