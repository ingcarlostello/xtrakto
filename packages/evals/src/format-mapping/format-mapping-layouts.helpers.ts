import { COLUMN_ROLE } from "@xtrakto/core";
import type { ColumnRole } from "@xtrakto/core";
import {
  COLUMN_NAMES,
  DIRECTION_WORDS,
  GENERATED_LAYOUTS,
  MAPPING_SET_SEED,
} from "./format-mapping-set.constants";
import type {
  DateStyle,
  IgnoredValue,
  Layout,
  LayoutColumn,
  NumberStyle,
} from "./format-mapping.types";
import { pick, seededRandom } from "./seeded-random.utils";
import type { Random } from "./seeded-random.utils";

const {
  DATE,
  DESCRIPTION,
  AMOUNT,
  MONEY_OUT,
  MONEY_IN,
  BALANCE,
  REFERENCE,
  DIRECTION,
  NONE,
} = COLUMN_ROLE;

const WAYS = ["signed", "out_in", "direction"] as const;
const DATE_STYLES: readonly DateStyle[] = [
  "dmy_slash",
  "dmy_dash",
  "dmy_time",
  "dmy_short_year",
  "dmy_month_name",
  "mdy_slash",
  "ymd_dash",
  "date_cell",
];
const NUMBER_STYLES: readonly NumberStyle[] = [
  "comma",
  "point",
  "comma_peso",
  "number_cell",
];

const column = (
  role: ColumnRole,
  name: string,
  holds?: IgnoredValue,
): LayoutColumn => ({ role, name, ...(holds ? { holds } : {}) });

// The money columns of one way of writing it, in an order the seed picks.
const moneyColumns = (
  way: (typeof WAYS)[number],
  random: Random,
): LayoutColumn[] => {
  if (way === "signed")
    return [column(AMOUNT, pick(random, COLUMN_NAMES.amount))];
  const pair =
    way === "out_in"
      ? [
          column(MONEY_OUT, pick(random, COLUMN_NAMES.moneyOut)),
          column(MONEY_IN, pick(random, COLUMN_NAMES.moneyIn)),
        ]
      : [
          column(AMOUNT, pick(random, COLUMN_NAMES.amount)),
          column(DIRECTION, pick(random, COLUMN_NAMES.direction)),
        ];
  return random() < 0.6 ? pair : pair.toReversed();
};

const optional = (isIn: boolean, of: LayoutColumn): LayoutColumn[] =>
  isIn ? [of] : [];

// The i-th generated layout's columns: a date first, then a second date, the
// description, a reference and a branch where its index says, the money, and
// the balance.
const generatedColumns = (
  index: number,
  way: (typeof WAYS)[number],
  random: Random,
): LayoutColumn[] => [
  column(DATE, pick(random, COLUMN_NAMES.date)),
  ...optional(
    index % 3 === 1,
    column(NONE, pick(random, COLUMN_NAMES.secondDate), "second_date"),
  ),
  column(DESCRIPTION, pick(random, COLUMN_NAMES.description)),
  ...optional(
    index % 5 === 2,
    column(REFERENCE, pick(random, COLUMN_NAMES.reference)),
  ),
  ...optional(
    index % 3 === 2,
    column(NONE, pick(random, COLUMN_NAMES.branch), "branch"),
  ),
  ...moneyColumns(way, random),
  ...optional(
    index % 4 !== 3,
    column(BALANCE, pick(random, COLUMN_NAMES.balance)),
  ),
];

// The i-th generated layout: each feature cycles at a pace of its own, so the
// set meets many of their combinations; the names come from the seed.
const generatedLayout = (index: number, random: Random): Layout => {
  const way = WAYS[index % WAYS.length] ?? "signed";
  const hasBalance = index % 4 !== 3;
  return {
    name: `generated-${String(index + 1).padStart(2, "0")}`,
    columns: generatedColumns(index, way, random),
    dates: DATE_STYLES[index % DATE_STYLES.length] ?? "dmy_slash",
    numbers:
      NUMBER_STYLES[(index + Math.floor(index / 8)) % NUMBER_STYLES.length] ??
      "comma",
    ...(way === "direction"
      ? { directionWords: pick(random, DIRECTION_WORDS) }
      : {}),
    titleRows: index % 3 !== 0,
    footer: index % 4 === 1,
    openingRow: hasBalance && index % 5 === 0,
    newestFirst: index % 2 === 1,
    zeroSide: index % 7 === 3,
    isHard: false,
  };
};

type HardFeatures = Pick<Layout, "dates" | "numbers"> &
  Partial<Omit<Layout, "name" | "columns" | "isHard">>;

const hard = (
  name: string,
  columns: readonly LayoutColumn[],
  features: HardFeatures,
): Layout => ({
  name: `hard-${name}`,
  columns,
  titleRows: false,
  footer: false,
  openingRow: false,
  newestFirst: false,
  zeroSide: false,
  isHard: true,
  ...features,
});

// Written by hand to be hard: names in English or cut short, a second column
// that could be the amount or the balance, a direction spelled out.
const HARD_LAYOUTS: readonly Layout[] = [
  hard(
    "english-out-in",
    [
      column(DATE, "Date"),
      column(DESCRIPTION, "Description"),
      column(MONEY_OUT, "Debit"),
      column(MONEY_IN, "Credit"),
      column(BALANCE, "Balance"),
    ],
    { dates: "mdy_slash", numbers: "point" },
  ),
  hard(
    "english-signed",
    [
      column(DATE, "Posting Date"),
      column(DESCRIPTION, "Details"),
      column(AMOUNT, "Amount"),
      column(BALANCE, "Running Balance"),
    ],
    { dates: "ymd_dash", numbers: "point", newestFirst: true },
  ),
  hard(
    "amount-and-fee",
    [
      column(DATE, "Fecha"),
      column(DESCRIPTION, "Concepto"),
      column(AMOUNT, "Valor"),
      column(NONE, "Comisión", "fee"),
      column(BALANCE, "Saldo"),
    ],
    { dates: "dmy_slash", numbers: "comma" },
  ),
  hard(
    "two-balances",
    [
      column(DATE, "FECHA"),
      column(DESCRIPTION, "DESCRIPCION"),
      column(MONEY_OUT, "DEBITOS"),
      column(MONEY_IN, "CREDITOS"),
      column(BALANCE, "SALDO CONTABLE"),
      column(NONE, "SALDO DISPONIBLE", "available_balance"),
    ],
    { dates: "dmy_slash", numbers: "comma", titleRows: true },
  ),
  hard(
    "abbreviated",
    [
      column(DATE, "F. TRANS"),
      column(DESCRIPTION, "DESC"),
      column(AMOUNT, "VLR"),
      column(BALANCE, "SDO"),
    ],
    { dates: "dmy_short_year", numbers: "comma_peso" },
  ),
  hard(
    "direction-spelled-out",
    [
      column(DATE, "Fecha"),
      column(NONE, "Canal", "channel"),
      column(DESCRIPTION, "Movimiento"),
      column(DIRECTION, "Naturaleza"),
      column(AMOUNT, "Monto"),
    ],
    {
      dates: "dmy_month_name",
      numbers: "number_cell",
      directionWords: { in: "Crédito", out: "Débito" },
      newestFirst: true,
    },
  ),
  hard(
    "wide",
    [
      column(DATE, "Fecha"),
      column(NONE, "Fecha valor", "second_date"),
      column(NONE, "Oficina", "branch"),
      column(DESCRIPTION, "Descripción"),
      column(REFERENCE, "Referencia"),
      column(NONE, "Canal", "channel"),
      column(MONEY_OUT, "Débitos"),
      column(MONEY_IN, "Créditos"),
      column(BALANCE, "Saldo"),
    ],
    {
      dates: "date_cell",
      numbers: "number_cell",
      footer: true,
      openingRow: true,
    },
  ),
  hard(
    "mixed-languages",
    [
      column(DATE, "Fecha"),
      column(DESCRIPTION, "Description"),
      column(AMOUNT, "Valor"),
      column(BALANCE, "Balance"),
    ],
    { dates: "dmy_dash", numbers: "point", titleRows: true, footer: true },
  ),
];

/**
 * Every layout of the set: the generated ones, from the set's seed, then the
 * hard ones. The same on every call.
 */
export const mappingLayouts = (): readonly Layout[] => {
  const random = seededRandom(MAPPING_SET_SEED);
  const generated = Array.from({ length: GENERATED_LAYOUTS }, (_, index) =>
    generatedLayout(index, random),
  );
  return [...generated, ...HARD_LAYOUTS];
};
