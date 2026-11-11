import {
  MAX_SAMPLE_NAME_LENGTH,
  MAX_SAMPLE_ROWS,
  MAX_SHAPE_LENGTH,
  ok,
  redactPii,
} from "@xtrakto/core";
import type {
  ExtractedContent,
  FormatSample,
  Result,
  SpreadsheetCell,
} from "@xtrakto/core";
import { firstSheetRows, isBlankRow } from "../sheets/sheet.utils";
import { DATE_CELL_SHAPE } from "./format-mapping.constants";
import { findTable, isHeaderRow } from "./mapping-table.helpers";

const UPPERCASE = /[\p{Lu}\p{Lt}]/u;
const LETTER = /\p{L}/u;
const DIGIT = /\p{N}/u;
const MARK = /\p{M}/u;
const SPACE = /\s/u;
const ASCII_PUNCTUATION = /[!-/:-@[-`{-~]/;
// Stands for any other character: "€", "°", an emoji.
const OTHER = "?";

const charShape = (char: string): string => {
  if (UPPERCASE.test(char)) return "A";
  if (LETTER.test(char)) return "a";
  if (DIGIT.test(char)) return "9";
  // An accent left apart from its letter, which already became an A or an a.
  if (MARK.test(char)) return "";
  if (SPACE.test(char)) return " ";
  return ASCII_PUNCTUATION.test(char) ? char : OTHER;
};

const textShape = (text: string): string =>
  [...text.normalize("NFC")]
    .map(charShape)
    .join("")
    .replace(/ {2,}/g, " ")
    .trim()
    .slice(0, MAX_SHAPE_LENGTH);

/**
 * A cell as the LLM sees it (ADR 0038): each letter an `A` or an `a`, each
 * digit a `9`, spaces and ASCII punctuation as written and anything else a
 * `?`; a date cell, the shape of a day. No value of the file stays.
 */
export const cellShape = (cell: SpreadsheetCell | undefined): string => {
  if (cell === undefined || cell === null) return "";
  if (typeof cell === "object") return DATE_CELL_SHAPE;
  return textShape(typeof cell === "number" ? String(cell) : cell);
};

const sampleName = (name: string): string =>
  redactPii(name).slice(0, MAX_SAMPLE_NAME_LENGTH);

/**
 * What the LLM reads of a spreadsheet no parser knows, to propose how to
 * read it (ADR 0038): its header's names, redacted, and the shapes of its
 * table's first rows, a shape for each column. The browser builds it, since
 * it holds the file; nothing above the header goes in it.
 */
export const formatSample = (
  content: ExtractedContent,
): Result<FormatSample> => {
  const table = findTable(content);
  if (!table.ok) return table;
  const { headerRow, header } = table.value;
  const rows = (firstSheetRows(content) ?? [])
    .slice(headerRow + 1)
    .filter((row) => !isBlankRow(row) && !isHeaderRow(row, header))
    .slice(0, MAX_SAMPLE_ROWS)
    .map((row) => header.map((_, column) => cellShape(row[column])));
  return ok({ header: header.map(sampleName), rows });
};
