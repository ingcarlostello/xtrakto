import type { ColumnRole, FormatMapping } from "@xtrakto/core";
import { mappingParser, reconcile } from "@xtrakto/parsers";
import { MAPPING_THRESHOLD_FIGURES } from "./format-mapping.constants";
import type {
  MappingCase,
  MappingPrediction,
  MappingScore,
  MappingThresholds,
} from "./format-mapping.types";

type Answered = {
  readonly testCase: MappingCase;
  readonly roles: readonly ColumnRole[];
};

type Proposed = {
  readonly testCase: MappingCase;
  readonly proposed: FormatMapping;
};

/** A part of a whole, from 0 to 1; 0 when there is nothing to count. */
const share = (part: number, whole: number): number =>
  whole === 0 ? 0 : part / whole;

const isEveryRoleRight = ({ testCase, roles }: Answered): boolean =>
  roles.length === testCase.expected.columns.length &&
  roles.every((role, index) => role === testCase.expected.columns[index]);

// A proposal reads its file when it reads every movement of it, and adds up
// when the file prints balances that then reconcile.
const readsAndAddsUp = ({ testCase, proposed }: Proposed): boolean => {
  const statement = mappingParser(proposed).parse(testCase.content);
  if (
    !statement.ok ||
    statement.value.transactions.length !== testCase.movementCount
  ) {
    return false;
  }
  return !testCase.hasBalances || reconcile(statement.value).balanceVerified;
};

// Each role's share of the columns that hold it, given that role.
const roleAccuracyOf = (
  predictions: readonly MappingPrediction[],
): ReadonlyMap<ColumnRole, number> => {
  const counts = new Map<ColumnRole, { right: number; total: number }>();
  for (const { testCase, roles } of predictions) {
    testCase.expected.columns.forEach((role, index) => {
      const { right, total } = counts.get(role) ?? { right: 0, total: 0 };
      const isRight = roles?.[index] === role;
      counts.set(role, { right: right + (isRight ? 1 : 0), total: total + 1 });
    });
  }
  return new Map(
    [...counts].map(([role, { right, total }]) => [role, share(right, total)]),
  );
};

/**
 * How a model did on the set: the files whose every column's role is right,
 * those whose proposal reads every movement and, with balances, reconciles,
 * and each role's accuracy. A file without an answer counts in every whole
 * and is right in none; one whose roles the code made no mapping with is
 * read in none.
 */
export const scoreMappings = (
  predictions: readonly MappingPrediction[],
): MappingScore => {
  const answered = predictions.flatMap(({ testCase, roles }) =>
    roles === undefined ? [] : [{ testCase, roles }],
  );
  const proposed = predictions.flatMap(({ testCase, proposed }) =>
    proposed === undefined ? [] : [{ testCase, proposed }],
  );
  const rolesRight = answered.filter(isEveryRoleRight).length;
  const readRight = proposed.filter(readsAndAddsUp).length;
  return {
    files: predictions.length,
    answered: answered.length,
    rolesRight,
    rolesRightShare: share(rolesRight, predictions.length),
    readRight,
    readRightShare: share(readRight, predictions.length),
    roleAccuracy: roleAccuracyOf(predictions),
  };
};

/** The figures of a score under the thresholds, in the report's order. */
export const failedMappingThresholds = (
  score: MappingScore,
  thresholds: MappingThresholds,
): (keyof MappingThresholds)[] =>
  MAPPING_THRESHOLD_FIGURES.filter(
    (figure) => score[figure] < thresholds[figure],
  );
