import type { MappingChoices, MappingReview } from "@xtrakto/parsers";
import type { NO_PROPOSAL } from "./format-confirmation.constants";

/** Why the LLM proposed no roles for a file: the person chooses them (11.3b). */
export type NoProposal = (typeof NO_PROPOSAL)[keyof typeof NO_PROPOSAL];

/**
 * A file no parser knows while the person confirms how to read it (11.3a,
 * 11.3b): the choices they made, and what the latest ones make of the file.
 */
export type FormatConfirmation = {
  readonly review: MappingReview;
  readonly choices: MappingChoices;
  /** The latest correction's number: a review counts when it answers it. */
  readonly revision: number;
  /** A correction waits for its review. */
  readonly isRereading: boolean;
  /** Why the LLM proposed nothing, when it didn't. */
  readonly noProposal?: NoProposal;
};
