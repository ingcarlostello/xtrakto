import { z } from "zod";
import {
  MOVEMENT_FILTERS,
  parsePeriodParam,
  TRANSACTIONS_PARAMS,
} from "@/utils/transactions-url.helpers";
import {
  MAX_MOVEMENTS_SHOWN,
  MAX_SEARCH_LENGTH,
  MOVEMENTS_STEP,
} from "./transaction.constants";

/**
 * How many movements to show, from the URL (`?show=60`): a whole number from
 * one step to the most the list shows. Anything else, a repeated param
 * included, shows the first step.
 */
export const shownCountSchema = z.coerce
  .number()
  .int()
  .min(MOVEMENTS_STEP)
  .max(MAX_MOVEMENTS_SHOWN)
  .catch(MOVEMENTS_STEP);

/**
 * The movements list's filters, from the URL. A param that doesn't parse is
 * left out, so the list opens on its defaults; whether the account is the
 * user's, the service checks.
 */
export const transactionsSearchSchema = z.object({
  [TRANSACTIONS_PARAMS.account]: z.uuid().optional().catch(undefined),
  [TRANSACTIONS_PARAMS.period]: z
    .string()
    .transform(parsePeriodParam)
    .optional()
    .catch(undefined),
  [TRANSACTIONS_PARAMS.search]: z
    .string()
    .trim()
    .max(MAX_SEARCH_LENGTH)
    .transform((text) => text || undefined)
    .optional()
    .catch(undefined),
  [TRANSACTIONS_PARAMS.filter]: z
    .enum(MOVEMENT_FILTERS)
    .optional()
    .catch(undefined),
  [TRANSACTIONS_PARAMS.shown]: shownCountSchema,
});
