import { CELL_SHAPE_PATTERN } from "@xtrakto/core";
import {
  findTable,
  formatSample,
  mappingFromRoles,
  mappingParser,
  reconcile,
} from "@xtrakto/parsers";
import { describe, expect, it } from "vitest";
import { FORMAT_MAPPING_CASES } from "../format-mapping/format-mapping-cases.constants";
import type {
  Layout,
  MappingCase,
} from "../format-mapping/format-mapping.types";
import {
  FORMAT_AGENT_CASES,
  MISLEADING_CASES,
  MISLEADING_LAYOUTS,
} from "./format-agent-cases.constants";

const MISLEADING = MISLEADING_LAYOUTS.flatMap((layout, index) => {
  const testCase = MISLEADING_CASES[index];
  return testCase ? [[layout.name, layout, testCase] as const] : [];
});

// A file read as its names alone say: the roles a proposal reading only the
// names would give, the formats read from the cells.
const readByNames = (layout: Layout, { content }: MappingCase) => {
  const roles = layout.columns.map(({ role, looksLike }) => looksLike ?? role);
  const mapping = mappingFromRoles(content, roles);
  if (!mapping.ok) throw new Error(JSON.stringify(mapping.error));
  const statement = mappingParser(mapping.value).parse(content);
  if (!statement.ok) throw new Error(JSON.stringify(statement.error));
  return statement.value;
};

describe("FORMAT_AGENT_CASES", () => {
  it("holds the mapping set's files, then those whose names mislead, each named once", () => {
    const names = FORMAT_AGENT_CASES.map(({ name }) => name);

    expect(FORMAT_AGENT_CASES.slice(0, FORMAT_MAPPING_CASES.length)).toEqual(
      FORMAT_MAPPING_CASES,
    );
    expect(FORMAT_AGENT_CASES.slice(FORMAT_MAPPING_CASES.length)).toEqual(
      MISLEADING_CASES,
    );
    expect(MISLEADING).toHaveLength(MISLEADING_LAYOUTS.length);
    expect(new Set(names).size).toBe(names.length);
  });

  it.each(MISLEADING)(
    "reads every movement of %s with its expected mapping",
    (_name, _layout, testCase) => {
      const { content, expected, headerRow, movementCount } = testCase;
      const statement = mappingParser(expected).parse(content);
      if (!statement.ok) throw new Error(JSON.stringify(statement.error));

      expect(findTable(content)).toMatchObject({
        ok: true,
        value: { headerRow },
      });
      expect(statement.value.transactions).toHaveLength(movementCount);
      expect(statement.value.warnings).toEqual([]);
      expect(reconcile(statement.value).balanceVerified).toBe(
        testCase.hasBalances,
      );
    },
  );

  it.each(MISLEADING.filter(([, , { hasBalances }]) => hasBalances))(
    "breaks %s's balances when read as its names say",
    (_name, layout, testCase) => {
      const statement = readByNames(layout, testCase);

      // Every movement reads a balance, and they don't chain.
      expect(statement.transactions).toHaveLength(testCase.movementCount);
      expect(
        statement.transactions.every(
          ({ balanceAfterMinor }) => balanceAfterMinor !== undefined,
        ),
      ).toBe(true);
      expect(reconcile(statement).balanceVerified).toBe(false);
    },
  );

  it("reads every movement the other way round in the file without balances, as its names say", () => {
    const [[, layout, testCase] = []] = MISLEADING.filter(
      ([, , { hasBalances }]) => !hasBalances,
    );
    if (!layout || !testCase) throw new Error("No file without balances.");
    const expected = mappingParser(testCase.expected).parse(testCase.content);
    if (!expected.ok) throw new Error(JSON.stringify(expected.error));

    expect(
      readByNames(layout, testCase).transactions.map((t) => t.amountMinor),
    ).toEqual(expected.value.transactions.map((t) => -t.amountMinor));
  });

  it.each(MISLEADING)(
    "keeps every value of %s out of the sample the LLM reads",
    (name, _layout, { content, headerRow }) => {
      const sample = formatSample(content);
      if (!sample.ok || content.type !== "spreadsheet") throw new Error(name);
      const rows = content.sheets[0]?.rows ?? [];
      const shapes = sample.value.rows.flat();
      // Every text and number of the file but its header's names.
      const values = [...rows.slice(0, headerRow), ...rows.slice(headerRow + 1)]
        .flat()
        .flatMap((cell) =>
          typeof cell === "string" || typeof cell === "number"
            ? [String(cell)]
            : [],
        )
        .filter((text) => /[\p{L}\p{N}].*[\p{L}\p{N}]/u.test(text));

      expect(shapes.every((shape) => CELL_SHAPE_PATTERN.test(shape))).toBe(
        true,
      );
      for (const value of values) {
        expect(shapes.some((shape) => shape.includes(value))).toBe(false);
      }
    },
  );
});
