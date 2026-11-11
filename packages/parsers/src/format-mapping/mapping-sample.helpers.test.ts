import {
  APP_ERROR_CODE,
  CELL_SHAPE_PATTERN,
  formatSampleSchema,
  MAX_SAMPLE_ROWS,
  MAX_SHAPE_LENGTH,
} from "@xtrakto/core";
import type { ExtractedContent, SpreadsheetCell } from "@xtrakto/core";
import { describe, expect, it } from "vitest";
import { fixtureContent, fixtureRows } from "../../fixtures/fixture.utils";
import {
  MAPPED_FIXTURES,
  type MappedFixtureName,
} from "../../fixtures/mapped-fixtures";
import { findTable } from "./mapping-table.helpers";
import { cellShape, formatSample } from "./mapping-sample.helpers";

const NAMES = Object.keys(MAPPED_FIXTURES) as MappedFixtureName[];

const spreadsheet = (rows: SpreadsheetCell[][]): ExtractedContent => ({
  type: "spreadsheet",
  sheets: [{ name: "Hoja1", rows }],
});

const sampleOf = (content: ExtractedContent) => {
  const sample = formatSample(content);
  if (!sample.ok) throw new Error(JSON.stringify(sample.error));
  return sample.value;
};

describe("cellShape", () => {
  it.each([
    ["COMPRA EN Tienda 123", "AAAAAA AA Aaaaaa 999"],
    ["15/03/2026", "99/99/9999"],
    ["02/09/2026 10:15", "99/99/9999 99:99"],
    ["-$ 85.400,00", "-$ 99.999,99"],
    ["(1.234,56)", "(9.999,99)"],
    ["Débito", "Aaaaaa"],
    ["ÑANDÚ", "AAAAA"],
    ["Café", "Aaaa"],
    ["  dos   espacios\t", "aaa aaaaaaaa"],
    ["€ 5½", "? 99"],
  ])("shapes %j as %j", (text, shape) => {
    expect(cellShape(text)).toBe(shape);
  });

  it("shapes a number cell by its digits", () => {
    expect(cellShape(-85_400.12)).toBe("-99999.99");
  });

  it("shapes a date cell as a day, whichever", () => {
    expect(cellShape({ excelSerial: 46_295 })).toBe("9999-99-99");
  });

  it("shapes an empty cell as nothing", () => {
    expect([cellShape(null), cellShape(undefined), cellShape("  ")]).toEqual([
      "",
      "",
      "",
    ]);
  });

  it("cuts a long text's shape", () => {
    expect(cellShape("COMPRA ".repeat(20))).toHaveLength(MAX_SHAPE_LENGTH);
  });
});

describe("formatSample", () => {
  it("names the columns as the table's header and shapes the rows under it", () => {
    const sample = sampleOf(fixtureContent(MAPPED_FIXTURES["mapped-out-in"]));

    expect(sample.header).toEqual([
      "FECHA TRANS",
      "DETALLE",
      "OFICINA",
      "DEBITOS",
      "CREDITOS",
      "SALDO",
    ]);
    expect(sample.rows.slice(0, 3)).toEqual([
      ["99/99/9999", "AAAAA AAAAAAAA", "", "", "", "9.999.999,99"],
      [
        "99/99/9999",
        "AAAAAA AAA AAAAAAAAAAAA AA AAAA",
        "9999",
        "99.999,99",
        "",
        "9.999.999,99",
      ],
      [
        "99/99/9999",
        "AAAAA AAAAAA AAAAAAA AAA",
        "9999",
        "",
        "9.999.999,99",
        "9.999.999,99",
      ],
    ]);
  });

  it.each(NAMES)(
    "takes at most %s's first rows, a shape for each column",
    (name) => {
      const content = fixtureContent(MAPPED_FIXTURES[name]);
      const table = findTable(content);
      if (!table.ok) throw new Error(name);
      const sample = sampleOf(content);

      expect(formatSampleSchema.parse(sample)).toEqual(sample);
      expect(sample.header).toEqual(table.value.header);
      expect(sample.rows).toHaveLength(MAX_SAMPLE_ROWS);
    },
  );

  it.each(NAMES)("keeps every value of %s out of its sample", (name) => {
    const fixture = MAPPED_FIXTURES[name];
    const { rows } = sampleOf(fixtureContent(fixture));
    const shapes = rows.flat();
    const values = fixtureRows(fixture)
      .flat()
      .filter((cell): cell is string | number =>
        ["string", "number"].includes(typeof cell),
      )
      .map(String)
      .filter((text) => /[\p{L}\p{N}].*[\p{L}\p{N}]/u.test(text));

    expect(shapes.every((shape) => CELL_SHAPE_PATTERN.test(shape))).toBe(true);
    for (const value of values) {
      expect(shapes.some((shape) => shape.includes(value))).toBe(false);
    }
  });

  it("leaves the title rows above the header out", () => {
    const { rows } = sampleOf(
      fixtureContent(MAPPED_FIXTURES["mapped-title-rows"]),
    );

    expect(rows[0]?.slice(0, 3)).toEqual([
      "99/99/9999 99:99",
      "99/99/9999",
      "AAAAAA AAA AAAAAAAAAAAA AA AAAA",
    ]);
  });

  it("skips blank rows and a page's repeated header", () => {
    const header = ["FECHA", "DETALLE", "VALOR"];
    const sample = sampleOf(
      spreadsheet([
        header,
        ["02/09/2026", "COMPRA", "-85.400,00"],
        [],
        [null, "  ", null],
        header,
        ["03/09/2026", "ABONO", "4.200.000,00"],
      ]),
    );

    expect(sample.rows).toEqual([
      ["99/99/9999", "AAAAAA", "-99.999,99"],
      ["99/99/9999", "AAAAA", "9.999.999,99"],
    ]);
  });

  it("redacts what a header's names hold", () => {
    const sample = sampleOf(
      spreadsheet([
        ["FECHA", "DETALLE", "VALOR", "Contacto ana@correo.com"],
        ["02/09/2026", "COMPRA", "-85.400,00", null],
      ]),
    );

    expect(sample.header[3]).toBe("CONTACTO [EMAIL]");
  });

  it("finds no table in content without one", () => {
    expect(formatSample(spreadsheet([["Hola"]]))).toMatchObject({
      ok: false,
      error: { code: APP_ERROR_CODE.UNKNOWN_FORMAT },
    });
  });
});
