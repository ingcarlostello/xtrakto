import { type FormatSample, redactPii } from "@xtrakto/core";
import type { AiPrompt } from "@/lib/ai";
import { MAPPING_FAILURE } from "./format-agent.constants";
import type { MappingFailure, MappingRetry } from "./mapping-retry.schemas";
import {
  PROPOSE_MAPPING_RETRY_V1,
  RETRY_INPUT_V1 as WORDS,
} from "./prompts/propose-mapping-retry.v1";
import {
  PROPOSE_MAPPING_V1,
  type ProposeMappingAnswer,
} from "./prompts/propose-mapping.v1";

const NAMELESS = "(no name)";

// A column's line: its shapes as JSON, so their punctuation never reads as
// the line's.
const columnLine = (name: string, shapes: readonly string[], index: number) =>
  `${index + 1}. ${name || NAMELESS}: ${JSON.stringify(shapes)}`;

/**
 * The proposal prompt's input for a sample: a line per column, from 1, with
 * its name, redacted once more so what a caller missed never leaves, and its
 * cells' shapes, top to bottom.
 */
export const proposalInput = ({ header, rows }: FormatSample): string =>
  header
    .map((name, column) =>
      columnLine(
        redactPii(name),
        rows.map((row) => row[column] ?? ""),
        column,
      ),
    )
    .join("\n");

/** A sample with its header's names redacted with the user's holder names. */
export const redactedSample = (
  sample: FormatSample,
  holderNames: readonly string[],
): FormatSample => ({
  ...sample,
  header: sample.header.map((name) =>
    redactPii(name, { knownNames: holderNames }),
  ),
});

// A proposal prompt for a table of `columns` columns: an answer with a role
// more or less fails its schema, so the fallback model answers instead.
const forColumns = (
  prompt: AiPrompt<ProposeMappingAnswer>,
  columns: number,
): AiPrompt<ProposeMappingAnswer> => ({
  ...prompt,
  schema: prompt.schema.refine(({ roles }) => roles.length === columns, {
    message: "a role for each column",
  }),
});

/** The first proposal's prompt for a table of `columns` columns. */
export const proposalPromptFor = (columns: number) =>
  forColumns(PROPOSE_MAPPING_V1, columns);

/** The second proposal's prompt for a table of `columns` columns (11.4). */
export const retryPromptFor = (columns: number) =>
  forColumns(PROPOSE_MAPPING_RETRY_V1, columns);

// What failed, as the second proposal reads it: codes in words, a column by
// its number from 1, as the input numbers them.
const failureText = (failure: MappingFailure): string => {
  if (failure.kind === MAPPING_FAILURE.NO_MOVEMENTS) return WORDS.noMovements;
  if (failure.kind === MAPPING_FAILURE.BALANCES_BREAK) {
    return failure.percent === 0
      ? WORDS.closingOff
      : WORDS.balancesBreak.replace("{percent}", String(failure.percent));
  }
  const { column, cause } = failure;
  const named =
    column === undefined ? WORDS.aColumn : `${WORDS.column} ${column}`;
  return WORDS.unread[cause].replace("{column}", named);
};

/**
 * The second proposal's input (11.4): the sample's columns as the first
 * one's, then the roles it gave, in their order, and what failed.
 */
export const retryInput = (
  sample: FormatSample,
  { roles, failure }: MappingRetry,
): string =>
  [
    proposalInput(sample),
    "",
    `${WORDS.rolesBefore} ${roles.map((role, column) => `${column + 1}. ${role}`).join("; ")}`,
    `${WORDS.failed} ${failureText(failure)}`,
  ].join("\n");

/** Whether a retry fits its sample: a role for each column, and a failure in one of them. */
export const isRetryOf = (
  { roles, failure }: MappingRetry,
  { header }: FormatSample,
): boolean =>
  roles.length === header.length &&
  (failure.kind !== MAPPING_FAILURE.UNREAD ||
    (failure.column ?? 0) <= header.length);
