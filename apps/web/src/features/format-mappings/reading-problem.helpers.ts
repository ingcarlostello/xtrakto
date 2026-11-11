import { ROLES_PROBLEM } from "@xtrakto/core";
import type { AppError, RolesProblem } from "@xtrakto/core";
import type { MappingReview } from "@xtrakto/parsers";
import {
  CONFIRMATION_COPY as COPY,
  DATE_ORDER_LABELS,
  NUMBER_LABELS,
  ROLES_PROBLEM_COPY,
} from "./format-confirmation.constants";
import { cellText } from "./format-confirmation.helpers";
import type { Verdict } from "./format-confirmation.helpers";

const { problem } = COPY;

const isRolesProblem = (cause: unknown): cause is RolesProblem =>
  Object.values(ROLES_PROBLEM).some((each) => each === cause);

// A failure names its column as the format compares names: the person reads
// it as the file writes it.
const columnName = (review: MappingReview, name: unknown): string => {
  const column = review.names.findIndex((each) => each === name);
  const written = cellText(review.header[column]);
  if (written !== "") return written;
  return typeof name === "string" ? name : "";
};

// What a cell of a row holds that the choices can't read.
const cellProblem = (
  { reason, cause }: { reason: unknown; cause: unknown },
  column: string,
  review: MappingReview,
): string => {
  const named = (text: string) => text.replace("{column}", column);
  if (reason === "missing_value") return named(problem.missing);
  if (cause === "date_format") {
    const order = DATE_ORDER_LABELS[review.dateOrder];
    return named(problem.dateFormat).replace("{order}", order);
  }
  if (cause === "direction") return named(problem.direction);
  if (cause === "both_amounts") return problem.bothAmounts;
  const example = NUMBER_LABELS[review.decimalSeparator];
  return named(problem.amount).replace("{example}", example);
};

// A column that reads no way the code knows, wherever it is.
const columnProblem = (cause: unknown, column: string): Verdict => {
  const named = ({ title, detail }: { title: string; detail: string }) => ({
    tone: "attention" as const,
    title: title.replace("{column}", column),
    detail,
  });
  if (cause === "date_format") return named(problem.noDates);
  if (cause === "direction") return named(problem.directionWords);
  return named(problem.other);
};

/**
 * Why the choices don't read the whole file, as the person can fix it (11.3b):
 * which column to choose, or which row doesn't read and why, by its number in
 * the spreadsheet and its column's name as the file writes it.
 */
export const readingProblem = (
  { details }: AppError,
  review: MappingReview,
): Verdict => {
  const reason = details?.["reason"];
  const cause = details?.["cause"];
  const row = details?.["row"];
  if (reason === "invalid_mapping") {
    const detail = isRolesProblem(cause)
      ? ROLES_PROBLEM_COPY[cause]
      : problem.other.detail;
    return { tone: "attention", title: problem.roles, detail };
  }
  if (reason === "no_movements") {
    return { tone: "attention", ...problem.noMovements };
  }
  const column = columnName(review, details?.["column"]);
  if (typeof row !== "number") return columnProblem(cause, column);
  return {
    tone: "attention",
    title: problem.row.replace("{row}", String(row + 1)),
    detail: cellProblem({ reason, cause }, column, review),
  };
};
