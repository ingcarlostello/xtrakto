// The format agent's set (11.5): the mapping proposal's invented files, and
// a few more whose names mislead, which only their balances settle, so the
// agent's repairs and second proposal run. Invented, as the mapping set is.
import { COLUMN_ROLE } from "@xtrakto/core";
import type { ColumnRole } from "@xtrakto/core";
import { FORMAT_MAPPING_CASES } from "../format-mapping/format-mapping-cases.constants";
import { mappingCase } from "../format-mapping/format-mapping-cases.helpers";
import { column } from "../format-mapping/format-mapping-layouts.helpers";
import type {
  Layout,
  LayoutColumn,
  MappingCase,
} from "../format-mapping/format-mapping.types";

const {
  DATE,
  DESCRIPTION,
  AMOUNT,
  MONEY_OUT,
  MONEY_IN,
  BALANCE,
  DIRECTION,
  NONE,
} = COLUMN_ROLE;

// A column whose name suggests a role it doesn't hold.
const misnamed = (of: LayoutColumn, looksLike: ColumnRole): LayoutColumn => ({
  ...of,
  looksLike,
});

type Features = Pick<Layout, "dates" | "numbers"> &
  Partial<Omit<Layout, "name" | "columns" | "isHard">>;

const misleading = (
  name: string,
  columns: readonly LayoutColumn[],
  features: Features,
): Layout => ({
  name: `misleading-${name}`,
  columns,
  titleRows: false,
  footer: false,
  openingRow: false,
  newestFirst: false,
  zeroSide: false,
  isHard: true,
  ...features,
});

/**
 * Invented layouts whose names mislead: a reading by the names alone breaks
 * their balances, or, without balances, reads every movement the other way
 * round.
 */
export const MISLEADING_LAYOUTS: readonly Layout[] = [
  // Money out and in under each other's names, as a bank's own books say it.
  misleading(
    "swapped-labels",
    [
      column(DATE, "FECHA"),
      column(DESCRIPTION, "DESCRIPCION"),
      misnamed(column(MONEY_OUT, "CREDITOS"), MONEY_IN),
      misnamed(column(MONEY_IN, "DEBITOS"), MONEY_OUT),
      column(BALANCE, "SALDO"),
    ],
    { dates: "dmy_slash", numbers: "comma", titleRows: true },
  ),
  // The same without balances: nothing proves its signs but the person.
  misleading(
    "swapped-labels-no-balances",
    [
      column(DATE, "Fecha"),
      column(DESCRIPTION, "Concepto"),
      misnamed(column(MONEY_OUT, "Abonos"), MONEY_IN),
      misnamed(column(MONEY_IN, "Cargos"), MONEY_OUT),
    ],
    { dates: "dmy_dash", numbers: "point", newestFirst: true },
  ),
  // Unsigned amounts, and a column whose name doesn't say it holds their way.
  misleading(
    "unnamed-direction",
    [
      column(DATE, "Fecha"),
      column(DESCRIPTION, "Detalle"),
      column(AMOUNT, "Valor"),
      misnamed(column(DIRECTION, "Mov"), NONE),
      column(BALANCE, "Saldo"),
    ],
    {
      dates: "dmy_month_name",
      numbers: "comma",
      directionWords: { in: "CR", out: "DB" },
    },
  ),
  // "SALDO" keeps the month's opening balance; "SALDO DISPONIBLE" follows
  // the movements.
  misleading(
    "frozen-balance",
    [
      column(DATE, "FECHA"),
      column(DESCRIPTION, "CONCEPTO"),
      column(AMOUNT, "VALOR"),
      misnamed(column(NONE, "SALDO", "frozen_balance"), BALANCE),
      misnamed(column(BALANCE, "SALDO DISPONIBLE"), NONE),
    ],
    { dates: "dmy_slash", numbers: "comma_peso", footer: true },
  ),
  // "Saldo" is each movement's balance before it, "Nuevo saldo" after it.
  misleading(
    "balance-before",
    [
      column(DATE, "Fecha"),
      column(DESCRIPTION, "Descripción"),
      column(MONEY_OUT, "Débitos"),
      column(MONEY_IN, "Créditos"),
      misnamed(column(NONE, "Saldo", "previous_balance"), BALANCE),
      misnamed(column(BALANCE, "Nuevo saldo"), NONE),
    ],
    { dates: "date_cell", numbers: "number_cell", newestFirst: true },
  ),
];

/** The files whose names mislead, each from a seed after the mapping set's. */
export const MISLEADING_CASES: readonly MappingCase[] = MISLEADING_LAYOUTS.map(
  (layout, index) => mappingCase(layout, FORMAT_MAPPING_CASES.length + index),
);

/** The format agent's set: the mapping proposal's files, then the misleading ones. */
export const FORMAT_AGENT_CASES: readonly MappingCase[] = [
  ...FORMAT_MAPPING_CASES,
  ...MISLEADING_CASES,
];
