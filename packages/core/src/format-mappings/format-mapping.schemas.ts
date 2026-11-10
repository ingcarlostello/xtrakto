import { z } from "zod";
import { isBankId } from "../banks/bank.helpers";
import type { BankId } from "../banks/bank.types";
import { DATE_ORDER } from "../dates/date.constants";
import {
  MAX_ROW_CELLS,
  MAX_TEXT_LENGTH,
} from "../extracted-content/extracted-content.constants";
import { DECIMAL_SEPARATOR } from "../money/money.constants";
import {
  COLUMN_ROLE,
  MAX_DIRECTION_WORD_LENGTH,
  MAX_DIRECTION_WORDS,
} from "./format-mapping.constants";
import { mappingProblem } from "./format-mapping.helpers";

// How to read a spreadsheet no parser knows (Stage 11). It comes from the
// browser and from an LLM's proposal, so every object is strict and every
// list is bounded.

const directionWordsSchema = z.strictObject({
  in: z
    .array(z.string().min(1).max(MAX_DIRECTION_WORD_LENGTH))
    .min(1)
    .max(MAX_DIRECTION_WORDS),
  out: z
    .array(z.string().min(1).max(MAX_DIRECTION_WORD_LENGTH))
    .min(1)
    .max(MAX_DIRECTION_WORDS),
});

export const formatMappingSchema = z
  .strictObject({
    /**
     * The names of the table's header, as `findTable` normalizes them: the
     * format's fingerprint. A column without a name has an empty one.
     */
    header: z.array(z.string().max(MAX_TEXT_LENGTH)).min(1).max(MAX_ROW_CELLS),
    /** The role of each of the header's columns, in order. */
    columns: z.array(z.enum(COLUMN_ROLE)).max(MAX_ROW_CELLS),
    /** How its dates write their parts; a date cell reads as the day it shows. */
    dateOrder: z.enum(DATE_ORDER),
    /** What marks its amounts' cents; a number cell reads as it is. */
    decimalSeparator: z.enum(DECIMAL_SEPARATOR),
    /** The words its direction column writes for money in and out. */
    directionWords: directionWordsSchema.optional(),
    /** Whose format it is, as the person said. */
    bankId: z.custom<BankId>(isBankId),
  })
  .superRefine((mapping, context) => {
    const problem = mappingProblem(mapping);
    if (problem !== undefined) {
      context.addIssue({ code: "custom", message: problem });
    }
  });
