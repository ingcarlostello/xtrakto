import { COLUMN_ROLE, formatMappingSchema, ok } from "@xtrakto/core";
import type {
  ColumnRole,
  ExtractedContent,
  FormatMapping,
  Result,
} from "@xtrakto/core";
import { parseFailed } from "../registry/parse-failure.helpers";
import { firstSheetRows } from "../sheets/sheet.utils";
import { PROPOSED_BANK_ID } from "./format-mapping.constants";
import { looksLikeDate } from "./mapping-cells.helpers";
import {
  dateOrderOf,
  decimalSeparatorOf,
  directionWordsOf,
} from "./mapping-formats.helpers";
import { findTable } from "./mapping-table.helpers";

const { DATE, AMOUNT, MONEY_OUT, MONEY_IN, BALANCE, DIRECTION } = COLUMN_ROLE;

const AMOUNT_ROLES: ReadonlySet<ColumnRole> = new Set([
  AMOUNT,
  MONEY_OUT,
  MONEY_IN,
  BALANCE,
]);

const notAMapping = parseFailed({ reason: "invalid_mapping" });

// A column whose cells read no way the code knows: its name, never a value.
const unread = (header: readonly string[], column: number, cause: string) =>
  parseFailed({
    reason: "invalid_value",
    column: header[column] ?? String(column),
    cause,
  });

/**
 * The mapping a table's roles make (11.2b): the roles proposed for its
 * columns, with how its dates, amounts and directions are written, read from
 * the rows that hold a date. Its bank waits for the person (11.3a). Roles
 * that read no table fail as `invalid_mapping`; dates or directions read no
 * way, with their column.
 */
export const mappingFromRoles = (
  content: ExtractedContent,
  roles: readonly ColumnRole[],
): Result<FormatMapping> => {
  const table = findTable(content);
  if (!table.ok) return table;
  const { headerRow, header } = table.value;
  const date = roles.indexOf(DATE);
  if (roles.length !== header.length || date === -1) return notAMapping;
  const rows = (firstSheetRows(content) ?? [])
    .slice(headerRow + 1)
    .filter((row) => looksLikeDate(row[date]));
  const dateOrder = dateOrderOf(rows.map((row) => row[date]));
  if (dateOrder === undefined) return unread(header, date, "date_format");
  const direction = roles.indexOf(DIRECTION);
  const directionWords =
    direction === -1
      ? undefined
      : directionWordsOf(rows.map((row) => row[direction]));
  if (direction !== -1 && directionWords === undefined) {
    return unread(header, direction, "direction");
  }
  const amountColumns = roles.flatMap((role, column) =>
    AMOUNT_ROLES.has(role) ? [column] : [],
  );
  const mapping = formatMappingSchema.safeParse({
    header,
    columns: roles,
    dateOrder,
    decimalSeparator: decimalSeparatorOf(
      rows.flatMap((row) => amountColumns.map((column) => row[column])),
    ),
    ...(directionWords === undefined ? {} : { directionWords }),
    bankId: PROPOSED_BANK_ID,
  });
  return mapping.success ? ok(mapping.data) : notAMapping;
};
