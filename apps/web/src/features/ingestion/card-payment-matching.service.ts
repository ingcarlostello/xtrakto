import "server-only";
import { pairCardPayments } from "@xtrakto/core";
import {
  linkCardPayments,
  listCardPaymentCandidates,
  type UserContext,
} from "@xtrakto/db";

/**
 * Pairs the user's payments to their cards with the cards' movements that
 * received them (12.3e), whichever statement was saved first and whenever:
 * a paired payment waits for no review. Run it in the transaction that
 * saved a statement. Returns how many it paired.
 */
export const pairUserCardPayments = async (
  ctx: UserContext,
): Promise<number> => {
  const { payments, received } = await listCardPaymentCandidates(ctx);
  if (payments.length === 0 || received.length === 0) return 0;
  const links = pairCardPayments(payments, received);
  await linkCardPayments(ctx, links);
  return links.length;
};
