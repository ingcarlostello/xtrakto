import { z } from "zod";
import { MAX_ROW_CELLS } from "../extracted-content/extracted-content.constants";
import {
  MAX_SAMPLE_NAME_LENGTH,
  MAX_SAMPLE_ROWS,
  MAX_SHAPE_LENGTH,
} from "./format-mapping.constants";

/**
 * A cell's shape (ADR 0038): each letter an `A` or an `a`, each digit a `9`,
 * spaces and ASCII punctuation as written. No other letter or digit, so no
 * value of the file.
 */
export const CELL_SHAPE_PATTERN = /^[Aa9 !-/:-@[-`{-~]*$/;

const cellShapeSchema = z
  .string()
  .max(MAX_SHAPE_LENGTH)
  .regex(CELL_SHAPE_PATTERN);

/**
 * What the LLM reads of a spreadsheet no parser knows, to propose how to
 * read it (11.2b): its header's names, redacted, and the shapes of the first
 * rows of its table, a shape for each column. It comes from the browser.
 */
export const formatSampleSchema = z
  .strictObject({
    header: z
      .array(z.string().max(MAX_SAMPLE_NAME_LENGTH))
      .min(1)
      .max(MAX_ROW_CELLS),
    rows: z
      .array(z.array(cellShapeSchema).max(MAX_ROW_CELLS))
      .min(1)
      .max(MAX_SAMPLE_ROWS),
  })
  .refine(
    ({ header, rows }) => rows.every((row) => row.length === header.length),
    { message: "a shape for each column" },
  );
