import { describe, expect, it } from "vitest";
import { MAX_ROW_CELLS } from "../extracted-content/extracted-content.constants";
import {
  MAX_SAMPLE_NAME_LENGTH,
  MAX_SAMPLE_ROWS,
  MAX_SHAPE_LENGTH,
} from "./format-mapping.constants";
import { formatSampleSchema } from "./format-sample.schemas";

const SAMPLE = {
  header: ["FECHA TRANS", "DETALLE", "DEBITOS", "CREDITOS", "SALDO"],
  rows: [
    ["99/99/9999", "AAAAAA AAA AAAAAAAAAAA", "99.999,99", "", "9.999.999,99"],
    ["99/99/9999", "Aaaaa aaaaaa", "", "-$ 9.999,99", "(99,999.99)"],
  ],
};

const withRows = (rows: string[][]) => ({ ...SAMPLE, rows });

describe("formatSampleSchema", () => {
  it("takes a header's names and the shapes of its rows", () => {
    expect(formatSampleSchema.parse(SAMPLE)).toEqual(SAMPLE);
  });

  it("takes the ASCII punctuation a shape keeps", () => {
    const shapes = ["!\"#$%&'()*+,-./", ":;<=>?@", "[\\]^_`", "{|}~"];
    const sample = { header: ["A", "B", "C", "D"], rows: [shapes] };

    expect(formatSampleSchema.safeParse(sample).success).toBe(true);
  });

  it.each([
    { holds: "a digit but 9", shape: "15/03/2026" },
    { holds: "a letter but A and a", shape: "COMPRA EN TIENDA" },
    { holds: "an accented letter", shape: "Aáa" },
    { holds: "a letter outside ASCII", shape: "AÑA" },
    { holds: "a symbol outside ASCII", shape: "€ 99" },
    { holds: "a tab", shape: "99\t99" },
  ])("refuses a shape that holds $holds", ({ shape }) => {
    const rows = [["99/99/9999", shape, "99", "", ""]];

    expect(formatSampleSchema.safeParse(withRows(rows)).success).toBe(false);
  });

  it("refuses a shape longer than its bound", () => {
    const long = "A".repeat(MAX_SHAPE_LENGTH + 1);
    const rows = [["99/99/9999", long, "99", "", ""]];

    expect(formatSampleSchema.safeParse(withRows(rows)).success).toBe(false);
  });

  it("refuses rows without a shape for each column", () => {
    const rows = [["99/99/9999", "AAAA", "99", ""]];

    expect(formatSampleSchema.safeParse(withRows(rows)).success).toBe(false);
  });

  it.each([
    { what: "no rows", sample: withRows([]) },
    {
      what: "more rows than a sample shows",
      sample: withRows(Array(MAX_SAMPLE_ROWS + 1).fill(SAMPLE.rows[0])),
    },
    {
      what: "a name longer than its bound",
      sample: {
        ...SAMPLE,
        header: SAMPLE.header.with(1, "A".repeat(MAX_SAMPLE_NAME_LENGTH + 1)),
      },
    },
    {
      what: "more columns than a row may have",
      sample: {
        header: Array(MAX_ROW_CELLS + 1).fill("A"),
        rows: [Array(MAX_ROW_CELLS + 1).fill("")],
      },
    },
    { what: "another field", sample: { ...SAMPLE, values: ["15/03/2026"] } },
  ])("refuses $what", ({ sample }) => {
    expect(formatSampleSchema.safeParse(sample).success).toBe(false);
  });
});
