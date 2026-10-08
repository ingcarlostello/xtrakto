import { z } from "zod";
import { localDateSchema, periodSchema } from "../dates/date.schemas";
import {
  MAX_SHEET_ROWS,
  MAX_TEXT_LENGTH,
} from "../extracted-content/extracted-content.constants";
import { amountMinorSchema, currencySchema } from "../money/money.schemas";
import {
  ACCOUNT_TYPE,
  PARSE_WARNING_CODE,
  PERIOD_SOURCE,
  REFERENCE_KIND,
} from "./statement.constants";

// The contract every bank parser returns. Objects are strict so a parser can't
// leak extra fields, such as the holder's address, into the rest of the system.

const KEBAB_CASE_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const MAX_ID_LENGTH = 100;

// Parsed text comes from a cell, so it is never longer than one.
const textSchema = z.string().min(1).max(MAX_TEXT_LENGTH);
const idSchema = z.string().max(MAX_ID_LENGTH).regex(KEBAB_CASE_PATTERN);
/** Position of the row in the extracted content, starting at 0. */
const sourceRowSchema = z.int().nonnegative();

export const parseWarningSchema = z.strictObject({
  code: z.enum(PARSE_WARNING_CODE),
  sourceRow: sourceRowSchema.optional(),
});

export const parsedTransactionSchema = z.strictObject({
  date: localDateSchema,
  descriptionRaw: textSchema,
  descriptionNormalized: textSchema,
  /** Signed: money in is positive, money out is negative. */
  amountMinor: amountMinorSchema,
  balanceAfterMinor: amountMinorSchema.optional(),
  /** Kept only until persistence, where identifiers are hashed. */
  referenceRaw: textSchema.optional(),
  referenceKind: z.enum(REFERENCE_KIND).optional(),
  sourceRow: sourceRowSchema,
});

/** As printed in the statement's summary; reconciliation compares them with the movements. */
const statementTotalsSchema = z.strictObject({
  creditsMinor: amountMinorSchema.optional(),
  debitsMinor: amountMinorSchema.optional(),
  interestMinor: amountMinorSchema.optional(),
  withholdingMinor: amountMinorSchema.optional(),
  averageBalanceMinor: amountMinorSchema.optional(),
});

// At most one transaction or warning per source row.
export const parsedStatementSchema = z.strictObject({
  bankId: idSchema,
  formatId: idSchema,
  accountType: z.enum(ACCOUNT_TYPE),
  /** Only the last 4 digits: the full account number is never kept. */
  accountLast4: z
    .string()
    .regex(/^\d{4}$/)
    .optional(),
  currency: currencySchema,
  period: periodSchema,
  periodSource: z.enum(PERIOD_SOURCE),
  openingBalanceMinor: amountMinorSchema.optional(),
  closingBalanceMinor: amountMinorSchema.optional(),
  totals: statementTotalsSchema.optional(),
  /** Used to detect transfers between the holder's own accounts. */
  holderName: textSchema.optional(),
  transactions: z.array(parsedTransactionSchema).max(MAX_SHEET_ROWS),
  warnings: z.array(parseWarningSchema).max(MAX_SHEET_ROWS),
});
