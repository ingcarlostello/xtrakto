import cases from "./categorization.cases.json";
import { categorizationCasesSchema } from "./categorization.schemas";
import type { CategorizationCase } from "./categorization.types";

/**
 * The categorization set (8.4): invented texts in Bancolombia's style that
 * no rule names, so only the LLM would see them. Never a real text, redacted
 * or not.
 */
export const CATEGORIZATION_CASES: readonly CategorizationCase[] =
  categorizationCasesSchema.parse(cases);
