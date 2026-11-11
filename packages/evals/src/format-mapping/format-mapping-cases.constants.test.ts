import {
  CELL_SHAPE_PATTERN,
  COLUMN_ROLE,
  compareLocalDates,
} from "@xtrakto/core";
import {
  findTable,
  formatSample,
  mappingParser,
  reconcile,
} from "@xtrakto/parsers";
import { describe, expect, it } from "vitest";
import { FORMAT_MAPPING_CASES } from "./format-mapping-cases.constants";
import { mappingCase } from "./format-mapping-cases.helpers";
import { amountCell } from "./format-mapping-cells.helpers";
import { mappingLayouts } from "./format-mapping-layouts.helpers";

const LAYOUTS = mappingLayouts();
const { AMOUNT, MONEY_OUT, DIRECTION, REFERENCE, NONE } = COLUMN_ROLE;

describe("FORMAT_MAPPING_CASES", () => {
  it("holds at least 40 invented files, each named once", () => {
    const names = FORMAT_MAPPING_CASES.map(({ name }) => name);

    expect(names.length).toBeGreaterThanOrEqual(40);
    expect(new Set(names).size).toBe(names.length);
  });

  it.each(FORMAT_MAPPING_CASES.map((testCase) => [testCase.name, testCase]))(
    "finds %s's header where the set wrote it, and reads every movement with its expected mapping",
    (_name, { content, expected, headerRow, movementCount, hasBalances }) => {
      const table = findTable(content);
      const statement = mappingParser(expected).parse(content);
      if (!statement.ok) throw new Error(JSON.stringify(statement.error));

      expect(table).toMatchObject({ ok: true, value: { headerRow } });
      expect(statement.value.transactions).toHaveLength(movementCount);
      expect(statement.value.warnings).toEqual([]);
      expect(reconcile(statement.value).balanceVerified).toBe(hasBalances);
    },
  );

  it("is the same on every run", () => {
    expect(mappingLayouts().map(mappingCase)).toEqual(FORMAT_MAPPING_CASES);
  });

  it("writes money every way, dates and numbers every way, and the layouts' features", () => {
    const has = (holds: (layout: (typeof LAYOUTS)[number]) => boolean) =>
      LAYOUTS.some(holds);
    const roles = (role: string) =>
      LAYOUTS.some(({ columns }) => columns.some((c) => c.role === role));

    expect(roles(MONEY_OUT) && roles(DIRECTION) && roles(REFERENCE)).toBe(true);
    expect(
      LAYOUTS.some(
        ({ columns }) =>
          columns.some((c) => c.role === AMOUNT) &&
          !columns.some((c) => c.role === DIRECTION),
      ),
    ).toBe(true);
    expect(new Set(LAYOUTS.map(({ dates }) => dates)).size).toBe(8);
    expect(new Set(LAYOUTS.map(({ numbers }) => numbers)).size).toBe(4);
    expect(has(({ titleRows }) => titleRows)).toBe(true);
    expect(has(({ footer }) => footer)).toBe(true);
    expect(has(({ openingRow }) => openingRow)).toBe(true);
    expect(
      has(({ openingRow, newestFirst }) => openingRow && newestFirst),
    ).toBe(true);
    expect(FORMAT_MAPPING_CASES.some(({ hasBalances }) => !hasBalances)).toBe(
      true,
    );
    expect(
      LAYOUTS.some(({ columns }) =>
        columns.some(
          ({ role, holds }) => role === NONE && holds === "second_date",
        ),
      ),
    ).toBe(true);
    expect(FORMAT_MAPPING_CASES.filter(({ isHard }) => isHard).length).toBe(8);
  });

  it.each(
    LAYOUTS.map((layout, index) => [layout.name, layout, index] as const),
  )("writes %s's features into its file", (name, layout, index) => {
    const testCase = FORMAT_MAPPING_CASES[index];
    const content = testCase?.content;
    if (!testCase || content?.type !== "spreadsheet") throw new Error(name);
    const cells = content.sheets[0]?.rows.flat() ?? [];
    const statement = mappingParser(testCase.expected).parse(content);
    if (!statement.ok) throw new Error(JSON.stringify(statement.error));
    const inFileOrder = statement.value.transactions.toSorted(
      (a, b) => a.sourceRow - b.sourceRow,
    );
    const [first, last] = [inFileOrder[0], inFileOrder.at(-1)];
    if (!first || !last) throw new Error(name);

    expect(testCase.headerRow !== 0).toBe(layout.titleRows);
    expect(cells.includes("Fin del extracto")).toBe(layout.footer);
    expect(cells.includes("SALDO ANTERIOR")).toBe(layout.openingRow);
    expect(compareLocalDates(first.date, last.date) > 0).toBe(
      layout.newestFirst,
    );
  });

  it("writes 0 on the empty side of money out and in where a layout says so", () => {
    const zeroSides = LAYOUTS.flatMap((layout, index) =>
      layout.zeroSide && layout.columns.some(({ role }) => role === MONEY_OUT)
        ? [{ layout, testCase: FORMAT_MAPPING_CASES[index] }]
        : [],
    );

    expect(zeroSides.length).toBeGreaterThan(0);
    for (const { layout, testCase } of zeroSides) {
      const content = testCase?.content;
      const cells =
        content?.type === "spreadsheet" ? content.sheets[0]?.rows : [];
      expect(cells?.flat()).toContain(amountCell(0, layout.numbers));
    }
  });

  it("keeps the title rows, with the holder's name and the account, above the table", () => {
    for (const { content, headerRow } of FORMAT_MAPPING_CASES) {
      const rows =
        content.type === "spreadsheet" ? content.sheets[0]?.rows : [];
      const above = JSON.stringify(rows?.slice(0, headerRow));
      const below = JSON.stringify(rows?.slice(headerRow));

      expect(below).not.toContain("ANA MARIA PRUEBA GOMEZ");
      expect(headerRow === 0 || above.includes("Cliente:")).toBe(true);
    }
  });

  it.each(FORMAT_MAPPING_CASES.map((testCase) => [testCase.name, testCase]))(
    "keeps every value of %s out of the sample the LLM reads",
    (name, { content, headerRow }) => {
      const sample = formatSample(content);
      const table = findTable(content);
      if (!sample.ok || !table.ok || content.type !== "spreadsheet") {
        throw new Error(name);
      }
      const rows = content.sheets[0]?.rows ?? [];
      const shapes = sample.value.rows.flat();
      // Every text of the file but its header's names, which the LLM reads.
      const values = [...rows.slice(0, headerRow), ...rows.slice(headerRow + 1)]
        .flat()
        .flatMap((cell) =>
          typeof cell === "string" || typeof cell === "number"
            ? [String(cell)]
            : [],
        )
        .filter((text) => /[\p{L}\p{N}].*[\p{L}\p{N}]/u.test(text));

      expect(sample.value.header).toEqual(table.value.header);
      expect(shapes.every((shape) => CELL_SHAPE_PATTERN.test(shape))).toBe(
        true,
      );
      for (const value of values) {
        expect(shapes.some((shape) => shape.includes(value))).toBe(false);
      }
    },
  );
});
