import { z } from "zod";
import {
  parsePeriodParam,
  TRANSACTIONS_PARAMS,
} from "./transactions-url.helpers";

/**
 * A page's account and period, from the URL, as Movimientos reads them: a
 * param that doesn't parse is left out, so the page opens on its latest.
 * Whether the account is the user's, the service checks.
 */
export const accountPeriodSearchSchema = z.object({
  [TRANSACTIONS_PARAMS.account]: z.uuid().optional().catch(undefined),
  [TRANSACTIONS_PARAMS.period]: z
    .string()
    .transform(parsePeriodParam)
    .optional()
    .catch(undefined),
});
