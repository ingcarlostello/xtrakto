import { z } from "zod";

/** The profile's "×": which of the user's rules to undo. Whose it is, the service checks. */
export const removeOwnRuleSchema = z.object({ rule: z.uuid() });
