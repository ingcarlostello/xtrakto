import { CATEGORIES, MONEY_DIRECTION } from "@xtrakto/core";
import { z } from "zod";

const categoryIdSchema = z.enum(CATEGORIES.map(({ id }) => id));

// About the length the bank cuts its texts to, with room for a longer one.
const MAX_TEXT_LENGTH = 40;

export const categorizationCaseSchema = z.object({
  text: z.string().trim().min(1).max(MAX_TEXT_LENGTH),
  direction: z.enum(Object.values(MONEY_DIRECTION)),
  expected: categoryIdSchema.nullable(),
});

export const categorizationCasesSchema = z.array(categorizationCaseSchema);
