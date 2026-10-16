import { z } from "zod";
import { MAX_MOVEMENTS_SHOWN, MOVEMENTS_STEP } from "./transaction.constants";

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
