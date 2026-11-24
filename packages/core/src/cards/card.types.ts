import type { z } from "zod";
import type { CARD_SUMMARY_KIND } from "./card.constants";
import type { cardStatementSchema, installmentSchema } from "./card.schemas";

export type CardSummaryKind =
  (typeof CARD_SUMMARY_KIND)[keyof typeof CARD_SUMMARY_KIND];
export type Installment = z.infer<typeof installmentSchema>;
export type CardStatement = z.infer<typeof cardStatementSchema>;
export type CardSummary = CardStatement["summary"];
