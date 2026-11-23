import type {
  AppError,
  ColumnRole,
  FormatMapping,
  Result,
} from "@xtrakto/core";
import type { MappingChoices, MappingReview } from "@xtrakto/parsers";
import type { NoProposal } from "./format-mapping.types";
import type { MappingRetry } from "./mapping-retry.schemas";

/**
 * What the format agent asks the page to do next (11.4): look up the mapping
 * saved for the format, read the file with it, ask the LLM for roles once or
 * again, read the file with roles or try their repairs in its worker, then
 * finish the file with the saved mapping, ask the person, or leave it unread.
 */
export type AgentCommand =
  | { readonly type: "lookUp" }
  | { readonly type: "readSaved"; readonly mapping: FormatMapping }
  | { readonly type: "propose" }
  | { readonly type: "proposeAgain"; readonly retry: MappingRetry }
  /** Unset choices: only the date the code found (11.3b). */
  | { readonly type: "review"; readonly choices?: MappingChoices }
  | { readonly type: "repair"; readonly choices: MappingChoices }
  | { readonly type: "finish" }
  | {
      readonly type: "ask";
      readonly review: MappingReview;
      readonly noProposal?: NoProposal;
    }
  | { readonly type: "fail"; readonly error: AppError };

/** What the page tells the format agent of what it asked (11.4). */
export type AgentEvent =
  | { readonly type: "lookedUp"; readonly mapping: FormatMapping | null }
  | { readonly type: "savedRead"; readonly isRead: boolean }
  | { readonly type: "proposed"; readonly roles: readonly ColumnRole[] }
  /** No roles: why, or nothing once the session ended. */
  | { readonly type: "notProposed"; readonly noProposal?: NoProposal }
  | { readonly type: "reviewed"; readonly result: Result<MappingReview> }
  /** The first repair whose balances chain, else what the roles read. */
  | { readonly type: "repaired"; readonly result: Result<MappingReview> };

/** Where the format agent is: what each proposal read, and the one it reads now. */
export type AgentState = {
  /** Each proposal's reading, repaired when its balances proved it. */
  readonly attempts: readonly MappingReview[];
  /** The latest proposal's roles, while the file is read with them. */
  readonly roles?: readonly ColumnRole[];
  /** Why the LLM proposed nothing, when it didn't. */
  readonly noProposal?: NoProposal;
};

export type AgentStep = {
  readonly state: AgentState;
  readonly command: AgentCommand;
};
