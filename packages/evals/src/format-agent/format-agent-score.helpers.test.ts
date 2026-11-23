import { COLUMN_ROLE, formatMappingSchema } from "@xtrakto/core";
import type { ColumnRole, FormatMapping } from "@xtrakto/core";
import { mappingParser, reconcile } from "@xtrakto/parsers";
import { describe, expect, it } from "vitest";
import { mappingCase } from "../format-mapping/format-mapping-cases.helpers";
import { column } from "../format-mapping/format-mapping-layouts.helpers";
import type {
  Layout,
  LayoutColumn,
  MappingCase,
} from "../format-mapping/format-mapping.types";
import { agentReport } from "./format-agent-report.helpers";
import {
  isBelowAgentThresholds,
  readsRight,
  scoreAgent,
} from "./format-agent-score.helpers";
import type { AgentRun } from "./format-agent.types";

const { DATE, DESCRIPTION, AMOUNT, MONEY_OUT, MONEY_IN, BALANCE, NONE } =
  COLUMN_ROLE;

const layout = (name: string, columns: readonly LayoutColumn[]): Layout => ({
  name,
  columns,
  dates: "dmy_slash",
  numbers: "comma",
  titleRows: false,
  footer: false,
  openingRow: false,
  newestFirst: false,
  zeroSide: false,
  isHard: false,
});

const WITH_BALANCES = mappingCase(
  layout("with-balances", [
    column(DATE, "FECHA"),
    column(NONE, "CANAL", "channel"),
    column(DESCRIPTION, "DETALLE"),
    column(MONEY_OUT, "DEBITOS"),
    column(MONEY_IN, "CREDITOS"),
    column(BALANCE, "SALDO"),
  ]),
  0,
);
const WITHOUT_BALANCES = mappingCase(
  layout("without-balances", [
    column(DATE, "FECHA"),
    column(DESCRIPTION, "DETALLE"),
    column(MONEY_OUT, "DEBITOS"),
    column(MONEY_IN, "CREDITOS"),
  ]),
  1,
);

const withRoles = (
  { expected }: MappingCase,
  roles: readonly ColumnRole[],
): FormatMapping => formatMappingSchema.parse({ ...expected, columns: roles });

// Money in and out the other way round.
const swapped = (testCase: MappingCase): FormatMapping =>
  withRoles(
    testCase,
    testCase.expected.columns.map((role) => {
      if (role === MONEY_OUT) return MONEY_IN;
      return role === MONEY_IN ? MONEY_OUT : role;
    }),
  );

const run = (
  testCase: MappingCase,
  readings: AgentRun["readings"],
  { proposals = 1, costMicroUsd = 400 } = {},
): AgentRun => ({ testCase, readings, proposals, costMicroUsd });

const RIGHT = WITH_BALANCES.expected;

const RUNS = [
  run(WITH_BALANCES, { first: RIGHT, repaired: RIGHT, shown: RIGHT }),
  // Money in and out swapped, and the code's repair.
  run(WITH_BALANCES, {
    first: swapped(WITH_BALANCES),
    repaired: RIGHT,
    shown: RIGHT,
  }),
  // The first proposal reads no whole file; the second reads it right.
  run(WITH_BALANCES, { shown: RIGHT }, { proposals: 2, costMicroUsd: 2_000 }),
  // Nothing proves the signs of a file without balances: the person must.
  run(WITHOUT_BALANCES, {
    first: swapped(WITHOUT_BALANCES),
    repaired: swapped(WITHOUT_BALANCES),
    shown: swapped(WITHOUT_BALANCES),
  }),
  // No proposal at all.
  run(WITHOUT_BALANCES, {}, { proposals: 0, costMicroUsd: 0 }),
];

describe("readsRight", () => {
  it("reads a file right with the mapping a person would confirm", () => {
    expect(readsRight(WITH_BALANCES, WITH_BALANCES.expected)).toBe(true);
    expect(readsRight(WITHOUT_BALANCES, WITHOUT_BALANCES.expected)).toBe(true);
  });

  it("doesn't read right a file whose balances then don't reconcile", () => {
    expect(readsRight(WITH_BALANCES, swapped(WITH_BALANCES))).toBe(false);
  });

  it("doesn't read right a file whose balance was left out, though it reads its movements", () => {
    const withoutBalance = withRoles(WITH_BALANCES, [
      DATE,
      NONE,
      DESCRIPTION,
      MONEY_OUT,
      MONEY_IN,
      NONE,
    ]);
    const statement = mappingParser(withoutBalance).parse(
      WITH_BALANCES.content,
    );

    expect(statement.ok && statement.value.transactions).toHaveLength(
      WITH_BALANCES.movementCount,
    );
    expect(readsRight(WITH_BALANCES, withoutBalance)).toBe(false);
  });

  it("doesn't read right money in and out swapped in a file without balances, though it reads every movement", () => {
    const statement = mappingParser(swapped(WITHOUT_BALANCES)).parse(
      WITHOUT_BALANCES.content,
    );

    expect(statement).toMatchObject({ ok: true });
    expect(statement.ok && statement.value.transactions).toHaveLength(
      WITHOUT_BALANCES.movementCount,
    );
    expect(readsRight(WITHOUT_BALANCES, swapped(WITHOUT_BALANCES))).toBe(false);
  });

  it("doesn't read right another column read as the description, though its balances reconcile", () => {
    const channel = withRoles(WITH_BALANCES, [
      DATE,
      DESCRIPTION,
      NONE,
      MONEY_OUT,
      MONEY_IN,
      BALANCE,
    ]);
    const statement = mappingParser(channel).parse(WITH_BALANCES.content);
    if (!statement.ok) throw new Error(JSON.stringify(statement.error));

    expect(reconcile(statement.value).balanceVerified).toBe(true);
    expect(readsRight(WITH_BALANCES, channel)).toBe(false);
  });

  it("doesn't read right a mapping that reads part of the file", () => {
    // Money out read as a signed amount: the rows of money in hold none.
    const partly = withRoles(WITHOUT_BALANCES, [
      DATE,
      DESCRIPTION,
      AMOUNT,
      NONE,
    ]);

    expect(readsRight(WITHOUT_BALANCES, partly)).toBe(false);
  });
});

describe("scoreAgent", () => {
  it("counts the files read right after each stage, and those left to the person", () => {
    expect(scoreAgent(RUNS)).toMatchObject({
      files: 5,
      right: { first: 1, repaired: 2, shown: 3 },
      rightShare: 0.6,
      leftToPerson: 2,
    });
  });

  it("counts the second proposals, and the proposals and cost per file", () => {
    expect(scoreAgent(RUNS)).toMatchObject({
      secondProposals: 1,
      proposalsPerFile: 1,
      costPerFileMicroUsd: 640,
    });
  });

  it("scores nothing as nothing", () => {
    expect(scoreAgent([])).toEqual({
      files: 0,
      right: { first: 0, repaired: 0, shown: 0 },
      rightShare: 0,
      leftToPerson: 0,
      secondProposals: 0,
      proposalsPerFile: 0,
      costPerFileMicroUsd: 0,
    });
  });
});

describe("isBelowAgentThresholds", () => {
  const score = scoreAgent(RUNS);

  it("is below when the share read right falls under its threshold", () => {
    expect(isBelowAgentThresholds(score, { rightShare: 0.61 })).toBe(true);
  });

  it("passes a share that reaches its threshold", () => {
    expect(isBelowAgentThresholds(score, { rightShare: 0.6 })).toBe(false);
  });
});

describe("agentReport", () => {
  it("gives figures only, the share read right at the end against its threshold", () => {
    expect(agentReport(scoreAgent(RUNS), { rightShare: 0.7 })).toEqual([
      "files 5, second proposals 1, 1.00 proposals and USD 0.0006 a file",
      "right after the 1st proposal  0.200 (1)",
      "right after its repairs       0.400 (2)",
      "right after the 2nd proposal  0.600 (3)  min 0.70  BELOW",
      "left to the person            0.400 (2)",
    ]);
  });
});
