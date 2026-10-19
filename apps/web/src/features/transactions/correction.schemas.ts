import type { CategoryId } from "@xtrakto/core";
import { z } from "zod";
import { isCategoryId } from "./correction.helpers";
import { CORRECTION_SCOPE } from "./transaction.constants";

/**
 * A correction from a movement's detail: its account and movement, one of
 * the table's categories, and whether it's for that movement or its text.
 * Whose movement it is and whether the category fits it, the service checks.
 */
export const correctionSchema = z.object({
  account: z.uuid(),
  movement: z.uuid(),
  category: z.custom<CategoryId>(isCategoryId),
  scope: z.enum(Object.values(CORRECTION_SCOPE)),
});
