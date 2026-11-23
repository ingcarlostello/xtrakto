import {
  amountMinorSchema,
  APP_ERROR_CODE,
  COLUMN_ROLE,
  err,
  formatMappingSchema,
  localDateSchema,
  ok,
} from "@xtrakto/core";
import type { AppError, AppErrorDetails, ColumnRole } from "@xtrakto/core";
import type { MappingReview } from "@xtrakto/parsers";
import { describe, expect, it } from "vitest";
import {
  AGENT_START,
  bestReading,
  failureOf,
  nextStep,
} from "./format-agent.helpers";
import type { AgentCommand, AgentEvent } from "./format-agent.types";
import { NO_PROPOSAL } from "./format-confirmation.constants";
import { mappingRetrySchema } from "./mapping-retry.schemas";

const minor = (amount: number) => amountMinorSchema.parse(amount);

const { DATE, DESCRIPTION, MONEY_OUT, MONEY_IN, BALANCE, NONE } = COLUMN_ROLE;

// "Banco Horizonte"'s invented statement, and its debits and credits swapped.
const ROLES: ColumnRole[] = [
  DATE,
  DESCRIPTION,
  NONE,
  MONEY_OUT,
  MONEY_IN,
  BALANCE,
];
const SWAPPED = ROLES.map((role) => {
  if (role === MONEY_OUT) return MONEY_IN;
  return role === MONEY_IN ? MONEY_OUT : role;
});
const MAPPING = formatMappingSchema.parse({
  header: ["FECHA TRANS", "DETALLE", "OFICINA", "DEBITOS", "CREDITOS", "SALDO"],
  columns: ROLES,
  dateOrder: "dmy",
  decimalSeparator: ",",
  bankId: "other",
});

// What some roles read: ten movements, with their balances when the file
// prints them, `broken` of which don't follow.
const readingOf = (
  roles: readonly ColumnRole[],
  broken?: number,
): MappingReview => ({
  header: MAPPING.header,
  names: MAPPING.header,
  rows: [],
  moreRows: 0,
  firstRow: 8,
  lastRow: 18,
  roles,
  dateOrder: "dmy",
  decimalSeparator: ",",
  reading: ok({
    mapping: { ...MAPPING, columns: [...roles] },
    test: {
      movementCount: 10,
      moneyIn: { count: 3, totalMinor: minor(445_001_215) },
      moneyOut: { count: 7, totalMinor: minor(183_400_000) },
      ...(broken === undefined
        ? {}
        : {
            balances: {
              openingMinor: minor(321_040_000),
              computedClosingMinor: minor(582_641_215),
              closingMinor: minor(582_641_215),
              closingOn: localDateSchema.parse("2026-09-30"),
              isVerified: broken === 0,
              brokenRows: broken,
            },
          }),
    },
  }),
});

// Roles that stop reading the file, as the parse failure says why.
const stoppedAt = (details: AppErrorDetails): MappingReview => ({
  ...readingOf(ROLES),
  reading: err({ code: APP_ERROR_CODE.PARSE_FAILED, details }),
});

const VERIFIED = readingOf(ROLES, 0);
const BROKEN = readingOf(SWAPPED, 10);
const WITHOUT_BALANCES = readingOf(ROLES);
const DATES_UNREAD = stoppedAt({
  reason: "invalid_value",
  column: "FECHA TRANS",
  row: 7,
  cause: "date_format",
});

// The agent from its start through the page's answers: every command it gave.
const commandsAfter = (events: readonly AgentEvent[]): AgentCommand[] => {
  let step = AGENT_START;
  const commands = [step.command];
  for (const event of events) {
    step = nextStep(step.state, event);
    commands.push(step.command);
  }
  return commands;
};

const lastAfter = (events: readonly AgentEvent[]) =>
  commandsAfter(events).at(-1);

const NOTHING_SAVED: AgentEvent = { type: "lookedUp", mapping: null };
const proposed = (roles: readonly ColumnRole[]): AgentEvent => ({
  type: "proposed",
  roles,
});
const reviewed = (review: MappingReview): AgentEvent => ({
  type: "reviewed",
  result: ok(review),
});
const repaired = (review: MappingReview): AgentEvent => ({
  type: "repaired",
  result: ok(review),
});

// A first proposal whose balances don't chain, and whose repairs don't help.
const FIRST_BROKEN: AgentEvent[] = [
  NOTHING_SAVED,
  proposed(SWAPPED),
  reviewed(BROKEN),
  repaired(BROKEN),
];

describe("nextStep", () => {
  it("looks up the mapping saved for the format, and finishes the file when it reads it", () => {
    expect(
      commandsAfter([
        { type: "lookedUp", mapping: MAPPING },
        { type: "savedRead", isRead: true },
      ]),
    ).toEqual([
      { type: "lookUp" },
      { type: "readSaved", mapping: MAPPING },
      { type: "finish" },
    ]);
  });

  it("asks the LLM when no mapping is saved, or the saved one no longer reads the file", () => {
    expect(lastAfter([NOTHING_SAVED])).toEqual({ type: "propose" });
    expect(
      lastAfter([
        { type: "lookedUp", mapping: MAPPING },
        { type: "savedRead", isRead: false },
      ]),
    ).toEqual({ type: "propose" });
  });

  it("reads the file with the proposal's roles, and asks the person once its balances chain", () => {
    expect(
      commandsAfter([NOTHING_SAVED, proposed(ROLES), reviewed(VERIFIED)]),
    ).toEqual([
      { type: "lookUp" },
      { type: "propose" },
      { type: "review", choices: { roles: ROLES } },
      { type: "ask", review: VERIFIED },
    ]);
  });

  it("tries the code's repairs on a reading without balances, which may find one left out", () => {
    const left = ROLES.with(ROLES.indexOf(BALANCE), NONE);

    expect(
      commandsAfter([
        NOTHING_SAVED,
        proposed(left),
        reviewed(readingOf(left)),
        repaired(VERIFIED),
      ]).slice(-2),
    ).toEqual([
      { type: "repair", choices: { roles: left } },
      { type: "ask", review: VERIFIED },
    ]);
  });

  it("asks the person about a file without balances when no repair finds one, since nothing proves it", () => {
    expect(
      lastAfter([
        NOTHING_SAVED,
        proposed(ROLES),
        reviewed(WITHOUT_BALANCES),
        repaired(WITHOUT_BALANCES),
      ]),
    ).toEqual({ type: "ask", review: WITHOUT_BALANCES });
  });

  it("tries the code's repairs on balances that don't chain, and asks with the one that adds up", () => {
    expect(
      commandsAfter([
        NOTHING_SAVED,
        proposed(SWAPPED),
        reviewed(BROKEN),
        repaired(VERIFIED),
      ]).slice(-2),
    ).toEqual([
      { type: "repair", choices: { roles: SWAPPED } },
      { type: "ask", review: VERIFIED },
    ]);
  });

  it("proposes again, told what failed in codes, when no repair adds up", () => {
    const command = lastAfter(FIRST_BROKEN);
    const retry = {
      roles: SWAPPED,
      failure: { kind: "balances_break", percent: 100 },
    };

    expect(command).toEqual({ type: "proposeAgain", retry });
    // Nothing but roles and codes: no value of the file.
    expect(mappingRetrySchema.parse(retry)).toEqual(retry);
  });

  it("proposes again without repairs when the roles don't read the file", () => {
    expect(
      commandsAfter([
        NOTHING_SAVED,
        proposed(ROLES),
        reviewed(DATES_UNREAD),
      ]).at(-1),
    ).toEqual({
      type: "proposeAgain",
      retry: {
        roles: ROLES,
        failure: { kind: "unread", column: 1, cause: "date" },
      },
    });
  });

  it("asks with the second proposal's reading when its balances chain", () => {
    expect(
      lastAfter([...FIRST_BROKEN, proposed(ROLES), reviewed(VERIFIED)]),
    ).toEqual({ type: "ask", review: VERIFIED });
  });

  it("repairs the second proposal's reading too", () => {
    expect(
      commandsAfter([
        ...FIRST_BROKEN,
        proposed(SWAPPED),
        reviewed(BROKEN),
        repaired(VERIFIED),
      ]).slice(-2),
    ).toEqual([
      { type: "repair", choices: { roles: SWAPPED } },
      { type: "ask", review: VERIFIED },
    ]);
  });

  it("ends with the person after two proposals, with the reading that reads most", () => {
    const commands = commandsAfter([
      ...FIRST_BROKEN,
      proposed(ROLES),
      reviewed(DATES_UNREAD),
    ]);

    expect(commands.filter(({ type }) => type.startsWith("propose"))).toEqual([
      { type: "propose" },
      expect.objectContaining({ type: "proposeAgain" }),
    ]);
    expect(commands.at(-1)).toEqual({ type: "ask", review: BROKEN });
  });

  it.each([
    { noProposal: NO_PROPOSAL.AI_FAILED },
    { noProposal: NO_PROPOSAL.USER_MONTH },
    {},
  ])(
    "asks with the first proposal's reading when the second gets none: $noProposal",
    (why) => {
      expect(
        lastAfter([...FIRST_BROKEN, { type: "notProposed", ...why }]),
      ).toEqual({ type: "ask", review: BROKEN });
    },
  );

  it("opens the file with only the date the code found when the LLM proposes nothing, saying why", () => {
    const dateAlone = readingOf([DATE, NONE, NONE, NONE, NONE, NONE]);

    expect(
      commandsAfter([
        NOTHING_SAVED,
        { type: "notProposed", noProposal: NO_PROPOSAL.USER_MONTH },
        reviewed(dateAlone),
      ]).slice(-2),
    ).toEqual([
      { type: "review" },
      {
        type: "ask",
        review: dateAlone,
        noProposal: NO_PROPOSAL.USER_MONTH,
      },
    ]);
  });

  it("leaves the file unread once the session ended", () => {
    expect(lastAfter([NOTHING_SAVED, { type: "notProposed" }])).toEqual({
      type: "fail",
      error: { code: APP_ERROR_CODE.UNAUTHORIZED },
    });
  });

  it("leaves the file unread when its worker can no longer read it", () => {
    const lost: AppError = { code: APP_ERROR_CODE.PARSE_FAILED };

    expect(
      lastAfter([
        NOTHING_SAVED,
        proposed(ROLES),
        { type: "reviewed", result: err(lost) },
      ]),
    ).toEqual({ type: "fail", error: lost });
    expect(
      lastAfter([
        NOTHING_SAVED,
        proposed(SWAPPED),
        reviewed(BROKEN),
        { type: "repaired", result: err(lost) },
      ]),
    ).toEqual({ type: "fail", error: lost });
  });
});

describe("failureOf", () => {
  it.each([
    [
      {
        reason: "invalid_value",
        column: "FECHA TRANS",
        row: 7,
        cause: "date_format",
      },
      { kind: "unread", column: 1, cause: "date" },
    ],
    [
      {
        reason: "invalid_value",
        column: "DEBITOS",
        row: 9,
        cause: "invalid_amount",
      },
      { kind: "unread", column: 4, cause: "amount" },
    ],
    [
      { reason: "invalid_value", column: "CREDITOS", cause: "direction" },
      { kind: "unread", column: 5, cause: "direction" },
    ],
    [
      {
        reason: "invalid_value",
        column: "CREDITOS",
        row: 8,
        cause: "both_amounts",
      },
      { kind: "unread", column: 5, cause: "both_amounts" },
    ],
    [
      { reason: "missing_value", column: "DETALLE", row: 8 },
      { kind: "unread", column: 2, cause: "empty" },
    ],
    [
      { reason: "invalid_value", column: "OTRA", row: 8 },
      { kind: "unread", cause: "amount" },
    ],
    [{ reason: "no_movements" }, { kind: "no_movements" }],
  ])(
    "says where a reading stops, by its column's number: %j",
    (details, failure) => {
      expect(failureOf(stoppedAt(details))).toEqual(failure);
    },
  );

  it("says the share of movements whose balance doesn't follow, in percent", () => {
    expect(failureOf(readingOf(ROLES, 3))).toEqual({
      kind: "balances_break",
      percent: 30,
    });
    expect(failureOf(readingOf(ROLES, 1))?.kind).toBe("balances_break");
  });

  it("finds nothing failed when the balances chain, or the file prints none", () => {
    expect(failureOf(VERIFIED)).toBeUndefined();
    expect(failureOf(WITHOUT_BALANCES)).toBeUndefined();
  });
});

describe("bestReading", () => {
  const stoppedOnRow = (row?: number) =>
    stoppedAt({
      reason: "invalid_value",
      column: "DEBITOS",
      ...(row === undefined ? {} : { row }),
    });

  it("takes the first whose balances chain", () => {
    const another = readingOf(SWAPPED, 0);

    expect(bestReading(BROKEN, VERIFIED)).toBe(VERIFIED);
    expect(bestReading(VERIFIED, another)).toBe(VERIFIED);
  });

  it("else the latest that reads the whole file", () => {
    expect(bestReading(BROKEN, WITHOUT_BALANCES)).toBe(WITHOUT_BALANCES);
    expect(bestReading(WITHOUT_BALANCES, BROKEN)).toBe(BROKEN);
    expect(bestReading(BROKEN, DATES_UNREAD)).toBe(BROKEN);
  });

  it("else the one that reads furthest down the file, the first on a tie", () => {
    const early = stoppedOnRow(5);
    const late = stoppedOnRow(9);
    const again = stoppedOnRow(9);

    expect(bestReading(early, late)).toBe(late);
    expect(bestReading(late, again)).toBe(late);
    expect(bestReading(stoppedOnRow(), early)).toBe(early);
  });
});
