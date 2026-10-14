import type { ParsedStatement } from "@xtrakto/core";
import type { BalanceCheck } from "@xtrakto/db";
import { reconcile } from "@xtrakto/parsers";

/** What `reconcile` finds in a statement, as the statement keeps it. */
export const balanceCheckOf = (statement: ParsedStatement): BalanceCheck => {
  const { balanceVerified, issues, closingDifferenceMinor } =
    reconcile(statement);
  return {
    verified: balanceVerified,
    differenceMinor: closingDifferenceMinor,
    breakPositions: issues.flatMap(({ position }) =>
      position === undefined ? [] : [position],
    ),
  };
};
