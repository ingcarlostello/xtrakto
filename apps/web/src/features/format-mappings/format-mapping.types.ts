import type { FormatMapping } from "@xtrakto/core";
import type { MappingReview } from "@xtrakto/parsers";

/**
 * What a mapping made from the LLM's roles makes of a file no parser knows,
 * for the person to confirm (11.3a).
 */
export type MappingProposal = {
  readonly mapping: FormatMapping;
  readonly review: MappingReview;
};
