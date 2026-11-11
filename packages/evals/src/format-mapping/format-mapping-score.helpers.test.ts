import { COLUMN_ROLE, formatMappingSchema } from "@xtrakto/core";
import type { ColumnRole, FormatMapping } from "@xtrakto/core";
import { mappingParser } from "@xtrakto/parsers";
import { describe, expect, it } from "vitest";
import { mappingCase } from "./format-mapping-cases.helpers";
import { mappingReport } from "./format-mapping-report.helpers";
import {
  failedMappingThresholds,
  scoreMappings,
} from "./format-mapping-score.helpers";
import type { Layout, LayoutColumn, MappingCase } from "./format-mapping.types";

const { DATE, DESCRIPTION, AMOUNT, MONEY_OUT, MONEY_IN, BALANCE, NONE } =
  COLUMN_ROLE;

const layout = (name: string, roles: readonly ColumnRole[]): Layout => ({
  name,
  columns: roles.map((role): LayoutColumn => ({
    role,
    name: `COLUMNA ${role.toUpperCase()}`,
  })),
  dates: "dmy_slash",
  numbers: "comma",
  titleRows: false,
  footer: false,
  openingRow: false,
  newestFirst: false,
  zeroSide: false,
  isHard: false,
});

const OUT_IN_BALANCE = layout("out-in-balance", [
  DATE,
  DESCRIPTION,
  MONEY_OUT,
  MONEY_IN,
  BALANCE,
]);
const OUT_IN = layout("out-in", [DATE, DESCRIPTION, MONEY_OUT, MONEY_IN]);
const SIGNED = layout("signed", [DATE, DESCRIPTION, AMOUNT]);

const WITH_BALANCES = mappingCase(OUT_IN_BALANCE, 0);
const WITH_BALANCES_TOO = mappingCase(OUT_IN_BALANCE, 1);
const WITHOUT_BALANCES = mappingCase(OUT_IN, 2);
const UNANSWERED = mappingCase(SIGNED, 3);

const withRoles = (
  mapping: FormatMapping,
  roles: readonly ColumnRole[],
): FormatMapping => formatMappingSchema.parse({ ...mapping, columns: roles });

// A model's roles, and the mapping the code made with them.
const predicted = (testCase: MappingCase, roles: readonly ColumnRole[]) => ({
  testCase,
  roles,
  proposed: withRoles(testCase.expected, roles),
});

// Money out read as money in, and the other way around.
const SWAPPED = [DATE, DESCRIPTION, MONEY_IN, MONEY_OUT];

const PREDICTIONS = [
  predicted(WITH_BALANCES, WITH_BALANCES.expected.columns),
  predicted(WITH_BALANCES_TOO, [...SWAPPED, BALANCE]),
  predicted(WITHOUT_BALANCES, SWAPPED),
  { testCase: UNANSWERED },
];

describe("scoreMappings", () => {
  it("counts the files whose every role is right, and those read whole that add up", () => {
    // The swapped file without balances reads every movement: nothing proves
    // its signs, so only its roles say it's wrong.
    expect(scoreMappings(PREDICTIONS)).toMatchObject({
      files: 4,
      answered: 3,
      rolesRight: 1,
      rolesRightShare: 0.25,
      readRight: 2,
      readRightShare: 0.5,
    });
  });

  it("gives each role its share of the columns that hold it, none for a file without an answer", () => {
    expect(scoreMappings(PREDICTIONS).roleAccuracy).toEqual(
      new Map([
        [DATE, 0.75],
        [DESCRIPTION, 0.75],
        [MONEY_OUT, 1 / 3],
        [MONEY_IN, 1 / 3],
        [BALANCE, 1],
        [AMOUNT, 0],
      ]),
    );
  });

  it("scores a model's roles when the code made no mapping with them, and reads that file in none", () => {
    const { columns } = WITH_BALANCES.expected;

    expect(
      scoreMappings([{ testCase: WITH_BALANCES, roles: columns }]),
    ).toMatchObject({ answered: 1, rolesRight: 1, readRight: 0 });
  });

  it("doesn't count a proposal that reads only part of its file as read", () => {
    // Money out read as a signed amount: the rows of money in hold none.
    const prediction = predicted(WITHOUT_BALANCES, [
      DATE,
      DESCRIPTION,
      AMOUNT,
      NONE,
    ]);
    const statement = mappingParser(prediction.proposed).parse(
      WITHOUT_BALANCES.content,
    );
    if (!statement.ok) throw new Error(JSON.stringify(statement.error));

    expect(statement.value.transactions.length).toBeLessThan(
      WITHOUT_BALANCES.movementCount,
    );
    expect(scoreMappings([prediction])).toMatchObject({
      answered: 1,
      rolesRight: 0,
      readRight: 0,
    });
  });

  it("doesn't count a proposal that reads no movement as read", () => {
    const prediction = predicted(WITHOUT_BALANCES, [
      DESCRIPTION,
      DATE,
      MONEY_OUT,
      MONEY_IN,
    ]);

    expect(scoreMappings([prediction])).toMatchObject({
      answered: 1,
      rolesRight: 0,
      readRight: 0,
    });
  });

  it("scores nothing as nothing", () => {
    expect(scoreMappings([])).toEqual({
      files: 0,
      answered: 0,
      rolesRight: 0,
      rolesRightShare: 0,
      readRight: 0,
      readRightShare: 0,
      roleAccuracy: new Map(),
    });
  });
});

describe("failedMappingThresholds", () => {
  const score = scoreMappings(PREDICTIONS);

  it("names the shares under their thresholds, in the report's order", () => {
    expect(
      failedMappingThresholds(score, {
        rolesRightShare: 0.3,
        readRightShare: 0.6,
      }),
    ).toEqual(["rolesRightShare", "readRightShare"]);
  });

  it("passes a share that reaches its threshold", () => {
    expect(
      failedMappingThresholds(score, {
        rolesRightShare: 0.25,
        readRightShare: 0.5,
      }),
    ).toEqual([]);
  });
});

describe("mappingReport", () => {
  it("gives figures only, against the thresholds, each role worst first", () => {
    const thresholds = { rolesRightShare: 0.2, readRightShare: 0.6 };

    expect(mappingReport(scoreMappings(PREDICTIONS), thresholds)).toEqual([
      "files 4, answered 3",
      "roles right  0.250 (1)  min 0.20  ok",
      "read right   0.500 (2)  min 0.60  BELOW",
      "  amount      0.00",
      "  money_in    0.33",
      "  money_out   0.33",
      "  date        0.75",
      "  description 0.75",
      "  balance     1.00",
    ]);
  });
});
