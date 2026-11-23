import { COLUMN_ROLE } from "@xtrakto/core";
import type { ColumnRole, ExtractedContent } from "@xtrakto/core";
import { firstSheetRows } from "../sheets/sheet.utils";
import { looksLikeDate } from "./mapping-cells.helpers";
import { directionWordsOf } from "./mapping-formats.helpers";
import { reviewChoices } from "./mapping-review.helpers";
import type { MappingReview } from "./mapping-review.helpers";
import type { MappingChoices } from "./mapping-roles.helpers";
import { findTable } from "./mapping-table.helpers";

const { DATE, AMOUNT, MONEY_OUT, MONEY_IN, BALANCE, DIRECTION, NONE } =
  COLUMN_ROLE;

type Roles = readonly ColumnRole[];

// Money in and out the other way round.
const swapped = (roles: Roles): Roles[] => {
  if (!roles.includes(MONEY_OUT) || !roles.includes(MONEY_IN)) return [];
  const other = (role: ColumnRole): ColumnRole => {
    if (role === MONEY_OUT) return MONEY_IN;
    return role === MONEY_IN ? MONEY_OUT : role;
  };
  return [roles.map(other)];
};

// For an amount read as signed, each column left out whose words say which
// way each movement went, as banks write it ("D" and "C").
const withDirection = (content: ExtractedContent, roles: Roles): Roles[] => {
  if (!roles.includes(AMOUNT) || roles.includes(DIRECTION)) return [];
  const table = findTable(content);
  if (!table.ok) return [];
  const { headerRow, dateColumn } = table.value;
  const date = roles.indexOf(DATE);
  const dated = (firstSheetRows(content) ?? [])
    .slice(headerRow + 1)
    .filter((row) => looksLikeDate(row[date === -1 ? dateColumn : date]));
  return roles.flatMap((role, column) => {
    const words = directionWordsOf(dated.map((row) => row[column]));
    return role === NONE && words !== undefined
      ? [roles.with(column, DIRECTION)]
      : [];
  });
};

// For roles without a balance, each column left out read as the balance.
const withBalance = (roles: Roles): Roles[] =>
  roles.includes(BALANCE)
    ? []
    : roles.flatMap((role, column) =>
        role === NONE ? [roles.with(column, BALANCE)] : [],
      );

const isVerified = ({ reading }: MappingReview): boolean =>
  reading.ok && reading.value.test.balances?.isVerified === true;

/**
 * How a file reads with the first repair of the choices whose balances chain
 * to the cent (11.4): money in and out the other way round; for an amount
 * read as signed, a column they left out that says each movement's way; or,
 * when they read no balance, a column they left out read as it (11.5).
 * Undefined when none does, or the file prints no balances: only its
 * balances prove a repair.
 */
export const repairChoices = (
  content: ExtractedContent,
  choices: MappingChoices,
): MappingReview | undefined => {
  const { roles } = choices;
  for (const repaired of [
    ...swapped(roles),
    ...withDirection(content, roles),
    ...withBalance(roles),
  ]) {
    const review = reviewChoices(content, { ...choices, roles: repaired });
    if (review.ok && isVerified(review.value)) return review.value;
  }
  return undefined;
};
