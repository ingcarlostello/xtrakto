import type { FormatMapping, ParsedStatement } from "@xtrakto/core";
import { mappingParser, reconcile } from "@xtrakto/parsers";
import type { MappingCase } from "../format-mapping/format-mapping.types";
import type {
  AgentRun,
  AgentScore,
  AgentStage,
  AgentThresholds,
} from "./format-agent.types";

/** A part of a whole, from 0 to 1; 0 when there is nothing to count. */
const share = (part: number, whole: number): number =>
  whole === 0 ? 0 : part / whole;

const statementOf = (
  mapping: FormatMapping,
  { content }: MappingCase,
): ParsedStatement | undefined => {
  const statement = mappingParser(mapping).parse(content);
  return statement.ok ? statement.value : undefined;
};

// Each movement's date, amount and text, in order.
const movementsOf = ({ transactions }: ParsedStatement): string =>
  JSON.stringify(
    transactions.map(({ date, amountMinor, descriptionNormalized }) => [
      date,
      amountMinor,
      descriptionNormalized,
    ]),
  );

/**
 * Whether a mapping reads a case right (11.5): the movements the person's
 * mapping reads, each one's date, amount and description, and, where the
 * file prints balances, balances that reconcile. Stricter than the mapping
 * eval's figure, which counts movements: money in and out swapped in a file
 * without balances, or another text read as the description, isn't right.
 */
export const readsRight = (
  testCase: MappingCase,
  mapping: FormatMapping,
): boolean => {
  const read = statementOf(mapping, testCase);
  const expected = statementOf(testCase.expected, testCase);
  if (read === undefined || expected === undefined) return false;
  if (testCase.hasBalances && !reconcile(read).balanceVerified) return false;
  return movementsOf(read) === movementsOf(expected);
};

const isRightAt = (
  { testCase, readings }: AgentRun,
  stage: AgentStage,
): boolean => {
  const mapping = readings[stage];
  return mapping !== undefined && readsRight(testCase, mapping);
};

/**
 * How the format agent did on a set: the files read right after the first
 * proposal, after the code's repairs and by the reading the person is shown;
 * those left to the person; the second proposals; and the proposals and
 * cost per file.
 */
export const scoreAgent = (runs: readonly AgentRun[]): AgentScore => {
  const rightAt = (stage: AgentStage) =>
    runs.filter((run) => isRightAt(run, stage)).length;
  const files = runs.length;
  const shown = rightAt("shown");
  const proposals = runs.reduce((total, run) => total + run.proposals, 0);
  const cost = runs.reduce((total, run) => total + run.costMicroUsd, 0);
  return {
    files,
    right: { first: rightAt("first"), repaired: rightAt("repaired"), shown },
    rightShare: share(shown, files),
    leftToPerson: files - shown,
    secondProposals: runs.filter((run) => run.proposals > 1).length,
    proposalsPerFile: share(proposals, files),
    costPerFileMicroUsd: share(cost, files),
  };
};

/** Whether a score falls under its thresholds. */
export const isBelowAgentThresholds = (
  score: AgentScore,
  thresholds: AgentThresholds,
): boolean => score.rightShare < thresholds.rightShare;
