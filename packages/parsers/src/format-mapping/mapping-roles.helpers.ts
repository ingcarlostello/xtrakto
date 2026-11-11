import {
  COLUMN_ROLE,
  columnRolesProblem,
  formatMappingSchema,
  ok,
} from "@xtrakto/core";
import type {
  ColumnRole,
  DateOrder,
  DecimalSeparator,
  ExtractedContent,
  FormatMapping,
  Result,
} from "@xtrakto/core";
import { parseFailed } from "../registry/parse-failure.helpers";
import { firstSheetRows } from "../sheets/sheet.utils";
import type { SheetRows } from "../sheets/sheet.utils";
import { PROPOSED_BANK_ID } from "./format-mapping.constants";
import { looksLikeDate } from "./mapping-cells.helpers";
import {
  dateOrderOf,
  decimalSeparatorOf,
  directionWordsOf,
} from "./mapping-formats.helpers";
import { findTable } from "./mapping-table.helpers";
import type { TableLocation } from "./mapping-table.helpers";

const { DATE, AMOUNT, MONEY_OUT, MONEY_IN, BALANCE, DIRECTION } = COLUMN_ROLE;

const AMOUNT_ROLES: ReadonlySet<ColumnRole> = new Set([
  AMOUNT,
  MONEY_OUT,
  MONEY_IN,
  BALANCE,
]);

/**
 * What the person chose for a file no parser knows (11.3b): each column's
 * role, and the formats they set. A format left unset is read from the cells.
 */
export type MappingChoices = {
  readonly roles: readonly ColumnRole[];
  readonly dateOrder?: DateOrder;
  readonly decimalSeparator?: DecimalSeparator;
};

/** How a table writes its dates, amounts and directions, as a mapping reads them. */
type MappingFormats = {
  /** Undefined when no order reads every date of its column. */
  readonly dateOrder?: DateOrder;
  readonly decimalSeparator: DecimalSeparator;
  /** A direction column's words; undefined when they aren't banks'. */
  readonly directionWords?: { in: string[]; out: string[] };
};

const notAMapping = parseFailed({ reason: "invalid_mapping" });

// A column whose cells read no way the code knows: its name, never a value.
const unread = (header: readonly string[], column: number, cause: string) =>
  parseFailed({
    reason: "invalid_value",
    column: header[column] ?? String(column),
    cause,
  });

// The columns whose cells say how a table writes its numbers: its amounts'
// and balance's, or, before the person names one, every column but the date's.
const numberColumns = (roles: readonly ColumnRole[], dateColumn: number) => {
  const amounts = roles.flatMap((role, column) =>
    AMOUNT_ROLES.has(role) ? [column] : [],
  );
  if (amounts.length > 0) return amounts;
  return roles.flatMap((_, column) => (column === dateColumn ? [] : [column]));
};

/**
 * The formats a table's roles read with: those the person set, else those
 * its rows with a date write, by the date column the roles name or, without
 * one, the column its first movement dates.
 */
export const formatsOf = (
  rows: SheetRows,
  table: TableLocation,
  { roles, dateOrder, decimalSeparator }: MappingChoices,
): MappingFormats => {
  const date = roles.indexOf(DATE);
  const dateColumn = date === -1 ? table.dateColumn : date;
  const dated = rows
    .slice(table.headerRow + 1)
    .filter((row) => looksLikeDate(row[dateColumn]));
  const cellsOf = (column: number) => dated.map((row) => row[column]);
  const amounts = numberColumns(roles, dateColumn).flatMap(cellsOf);
  const direction = roles.indexOf(DIRECTION);
  const directionWords =
    direction === -1 ? undefined : directionWordsOf(cellsOf(direction));
  return {
    dateOrder: dateOrder ?? dateOrderOf(cellsOf(dateColumn)),
    decimalSeparator: decimalSeparator ?? decimalSeparatorOf(amounts),
    ...(directionWords === undefined ? {} : { directionWords }),
  };
};

/**
 * The mapping the choices make of a table: their roles, with the formats the
 * person set or those its cells write. Its bank waits for the person (11.3a).
 * Roles that read no table fail as `invalid_mapping`, saying why; dates no
 * order reads, or a direction column's words that aren't banks', fail with
 * their column.
 */
export const mappingOn = (
  rows: SheetRows,
  table: TableLocation,
  choices: MappingChoices,
): Result<FormatMapping> => {
  const { header } = table;
  const { roles } = choices;
  if (roles.length !== header.length) return notAMapping;
  const problem = columnRolesProblem(roles);
  if (problem !== undefined) {
    return parseFailed({ reason: "invalid_mapping", cause: problem });
  }
  const { dateOrder, ...formats } = formatsOf(rows, table, choices);
  if (dateOrder === undefined) {
    return unread(header, roles.indexOf(DATE), "date_format");
  }
  const direction = roles.indexOf(DIRECTION);
  if (direction !== -1 && formats.directionWords === undefined) {
    return unread(header, direction, "direction");
  }
  const mapping = formatMappingSchema.safeParse({
    header,
    columns: roles,
    dateOrder,
    ...formats,
    bankId: PROPOSED_BANK_ID,
  });
  return mapping.success ? ok(mapping.data) : notAMapping;
};

/** The mapping a spreadsheet's table reads with the person's choices (11.3b). */
export const mappingFromChoices = (
  content: ExtractedContent,
  choices: MappingChoices,
): Result<FormatMapping> => {
  const table = findTable(content);
  if (!table.ok) return table;
  return mappingOn(firstSheetRows(content) ?? [], table.value, choices);
};

/**
 * The mapping a table's roles make (11.2b): the roles proposed for its
 * columns, with how its dates, amounts and directions are written, read from
 * the rows that hold a date.
 */
export const mappingFromRoles = (
  content: ExtractedContent,
  roles: readonly ColumnRole[],
): Result<FormatMapping> => mappingFromChoices(content, { roles });
