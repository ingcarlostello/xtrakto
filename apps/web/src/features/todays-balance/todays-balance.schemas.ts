import { z } from "zod";

// Longer than any amount a person types; `parseTypedAmount` reads the rest.
const MAX_TYPED_LENGTH = 40;

/** What the field sends: its account and the balance as it was typed. */
export const todaysBalanceSchema = z.object({
  accountId: z.uuid(),
  balance: z.string().trim().min(1).max(MAX_TYPED_LENGTH),
});
