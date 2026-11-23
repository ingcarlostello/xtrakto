import { APP_ERROR_CODE } from "@xtrakto/core";
import type { AppError, Result } from "@xtrakto/core";
import type { MappingReview } from "@xtrakto/parsers";
import {
  MAPPING_FAILURE,
  MAX_PROPOSALS,
  UNREAD_CAUSE,
} from "./format-agent.constants";
import type {
  AgentCommand,
  AgentEvent,
  AgentState,
  AgentStep,
} from "./format-agent.types";
import type { NoProposal } from "./format-mapping.types";
import type { MappingFailure } from "./mapping-retry.schemas";

type UnreadCause = (typeof UNREAD_CAUSE)[keyof typeof UNREAD_CAUSE];

/** The format agent's first step (11.4): look up the mapping saved for the format. */
export const AGENT_START: AgentStep = {
  state: { attempts: [] },
  command: { type: "lookUp" },
};

const PROPOSE: AgentCommand = { type: "propose" };
const SESSION_ENDED: AppError = { code: APP_ERROR_CODE.UNAUTHORIZED };

const to = (state: AgentState, command: AgentCommand): AgentStep => ({
  state,
  command,
});

const balancesOf = ({ reading }: MappingReview) =>
  reading.ok ? reading.value.test.balances : undefined;

// Why a column's cells don't read, by the parse failure's cause.
const CAUSES: Readonly<Partial<Record<string, UnreadCause>>> = {
  date_format: UNREAD_CAUSE.DATE,
  direction: UNREAD_CAUSE.DIRECTION,
  both_amounts: UNREAD_CAUSE.BOTH_AMOUNTS,
};

// A reading that stopped: no movement, or a column's cells that don't read,
// the column by its number from 1, never its name or a value.
const unreadFailure = (
  { details }: AppError,
  names: readonly string[],
): MappingFailure => {
  if (details?.["reason"] === "no_movements") {
    return { kind: MAPPING_FAILURE.NO_MOVEMENTS };
  }
  const column = names.indexOf(String(details?.["column"])) + 1;
  const cause =
    details?.["reason"] === "missing_value"
      ? UNREAD_CAUSE.EMPTY
      : (CAUSES[String(details?.["cause"])] ?? UNREAD_CAUSE.AMOUNT);
  return {
    kind: MAPPING_FAILURE.UNREAD,
    cause,
    ...(column > 0 ? { column } : {}),
  };
};

/**
 * What failed in a proposal's reading, as the second proposal is told it
 * (11.4): a column that doesn't read, no movement, or the share of
 * movements whose balance doesn't follow. Undefined when its balances chain,
 * or the file prints none, which nothing proves.
 */
export const failureOf = (
  review: MappingReview,
): MappingFailure | undefined => {
  const { reading } = review;
  if (!reading.ok) return unreadFailure(reading.error, review.names);
  const { balances, movementCount } = reading.value.test;
  if (balances === undefined || balances.isVerified) return undefined;
  const share = balances.brokenRows / Math.max(movementCount, 1);
  return {
    kind: MAPPING_FAILURE.BALANCES_BREAK,
    percent: Math.round(100 * share),
  };
};

// How far down the file a reading reads: all of it, or the row it stops at.
const readRows = ({ reading }: MappingReview): number => {
  if (reading.ok) return Number.POSITIVE_INFINITY;
  const row = reading.error.details?.["row"];
  return typeof row === "number" ? row : -1;
};

/**
 * The reading the person sees after the proposals (11.4): the first whose
 * balances chain, else the latest that reads the whole file, else the one
 * that reads furthest down it, the first on a tie.
 */
export const bestReading = (
  first: MappingReview,
  ...rest: readonly MappingReview[]
): MappingReview => {
  const attempts = [first, ...rest];
  return (
    attempts.find((review) => balancesOf(review)?.isVerified === true) ??
    attempts.findLast(({ reading }) => reading.ok) ??
    attempts.reduce((best, each) =>
      readRows(each) > readRows(best) ? each : best,
    )
  );
};

// A proposal read: the person sees the best reading once one verifies, or
// reads a file nothing proves, or after the last proposal; else the LLM
// proposes again, told what failed.
const attempted = (state: AgentState, review: MappingReview): AgentStep => {
  const [first = review, ...rest] = [...state.attempts, review];
  const attempts = [first, ...rest];
  const failure = failureOf(review);
  if (failure === undefined || attempts.length >= MAX_PROPOSALS) {
    return to(
      { attempts },
      { type: "ask", review: bestReading(first, ...rest) },
    );
  }
  const retry = { roles: [...review.roles], failure };
  return to({ attempts }, { type: "proposeAgain", retry });
};

// Without roles: the first proposal's file opens with only the date the code
// found (11.3b), unless the session ended; a second's, with the first's reading.
const notProposed = (state: AgentState, noProposal?: NoProposal): AgentStep => {
  const [first] = state.attempts;
  if (first !== undefined) return to(state, { type: "ask", review: first });
  if (noProposal === undefined) {
    return to(state, { type: "fail", error: SESSION_ENDED });
  }
  return to({ ...state, noProposal }, { type: "review" });
};

// A reading whose balances don't chain gets the code's repairs first.
const reviewed = (
  state: AgentState,
  result: Result<MappingReview>,
): AgentStep => {
  if (!result.ok) return to(state, { type: "fail", error: result.error });
  const review = result.value;
  const { roles, noProposal } = state;
  if (roles === undefined) {
    const why = noProposal === undefined ? {} : { noProposal };
    return to(state, { type: "ask", review, ...why });
  }
  return balancesOf(review)?.isVerified === false
    ? to(state, { type: "repair", choices: { roles } })
    : attempted(state, review);
};

/**
 * The format agent's next step (11.4), from where it is and what the page
 * tells it: the saved mapping when there is one and it reads the file; else
 * the LLM's roles, read in the file's worker, repaired where the balances
 * prove it, proposed once more told what failed, and the best reading for
 * the person to confirm. Pure, so tests and the eval run it without a browser.
 */
export const nextStep = (state: AgentState, event: AgentEvent): AgentStep => {
  switch (event.type) {
    case "lookedUp":
      return to(
        state,
        event.mapping === null
          ? PROPOSE
          : { type: "readSaved", mapping: event.mapping },
      );
    case "savedRead":
      return to(state, event.isRead ? { type: "finish" } : PROPOSE);
    case "proposed": {
      const { roles } = event;
      return to({ ...state, roles }, { type: "review", choices: { roles } });
    }
    case "notProposed":
      return notProposed(state, event.noProposal);
    case "reviewed":
      return reviewed(state, event.result);
    case "repaired":
      return event.result.ok
        ? attempted(state, event.result.value)
        : to(state, { type: "fail", error: event.result.error });
  }
};
