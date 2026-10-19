import { z } from "zod";
import { RULE_CHANGE } from "./transaction.constants";

/**
 * A change from a movement's own block: its account and movement, and
 * whether it makes its Nequi number the user's or undoes a rule. Whose
 * movement it is and whether it has that number or rule, the service checks.
 */
export const ruleChangeSchema = z.object({
  account: z.uuid(),
  movement: z.uuid(),
  intent: z.enum(Object.values(RULE_CHANGE)),
});
