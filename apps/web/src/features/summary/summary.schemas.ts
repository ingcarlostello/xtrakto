import { z } from "zod";
import { accountPagePeriodSearchSchema } from "@/utils/account-period.schemas";
import {
  MOVEMENT_FILTERS,
  TRANSACTIONS_PARAMS,
} from "@/utils/transactions-url.helpers";

/**
 * The summary's account and period, and the lines "Tu extracto, traducido"
 * shows (8.6c), from the URL; a filter that doesn't parse shows them all.
 */
export const summarySearchSchema = accountPagePeriodSearchSchema.extend({
  [TRANSACTIONS_PARAMS.lines]: z
    .enum(MOVEMENT_FILTERS)
    .optional()
    .catch(undefined),
});
