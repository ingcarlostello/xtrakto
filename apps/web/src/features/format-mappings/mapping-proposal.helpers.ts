import { type FormatSample, redactPii } from "@xtrakto/core";
import type { AiPrompt } from "@/lib/ai";
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

/**
 * The proposal prompt for a table of `columns` columns: an answer with a
 * role more or less fails its schema, so the fallback model answers instead.
 */
export const proposalPromptFor = (
  columns: number,
): AiPrompt<ProposeMappingAnswer> => ({
  ...PROPOSE_MAPPING_V1,
  schema: PROPOSE_MAPPING_V1.schema.refine(
    ({ roles }) => roles.length === columns,
    { message: "a role for each column" },
  ),
});
