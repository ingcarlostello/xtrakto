import { z } from "zod";
import { accountPeriodSearchSchema } from "@/utils/account-period.schemas";
import {
  RECURRING_FILTERS,
  TRANSACTIONS_PARAMS,
} from "@/utils/transactions-url.helpers";

/**
 * Pagos fijos's account, period and list, from the URL. A param that doesn't
 * parse is left out, so the page opens on the payments its month expects.
 */
export const recurringSearchSchema = accountPeriodSearchSchema.extend({
  [TRANSACTIONS_PARAMS.filter]: z
    .enum(RECURRING_FILTERS)
    .optional()
    .catch(undefined),
});
