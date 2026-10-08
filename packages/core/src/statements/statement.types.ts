import type { z } from "zod";
import type {
  ACCOUNT_TYPE,
  PARSE_WARNING_CODE,
  PERIOD_SOURCE,
  REFERENCE_KIND,
} from "./statement.constants";
import type {
  parsedStatementSchema,
  parsedTransactionSchema,
  parseWarningSchema,
} from "./statement.schemas";

export type AccountType = (typeof ACCOUNT_TYPE)[keyof typeof ACCOUNT_TYPE];
export type PeriodSource = (typeof PERIOD_SOURCE)[keyof typeof PERIOD_SOURCE];
export type ReferenceKind =
  (typeof REFERENCE_KIND)[keyof typeof REFERENCE_KIND];
export type ParseWarningCode =
  (typeof PARSE_WARNING_CODE)[keyof typeof PARSE_WARNING_CODE];

export type ParseWarning = z.infer<typeof parseWarningSchema>;
export type ParsedTransaction = z.infer<typeof parsedTransactionSchema>;
export type ParsedStatement = z.infer<typeof parsedStatementSchema>;
