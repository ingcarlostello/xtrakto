import "server-only";
import {
  listMovementAccounts,
  listMovementQuarters,
  listUnreconciledStatements,
  type UserContext,
} from "@xtrakto/db";
import { quarterChoices, selectPeriod } from "./period-choices.helpers";
import type { PeriodChoices, PeriodRequest } from "./period-controls.types";

/**
 * The account and the period a page shows: those the URL asks when they're
 * the user's and have movements, else the account with the latest and its
 * latest quarter. `undefined` until a movement counts.
 */
export const locateAccountPeriod = async (
  ctx: UserContext,
  request: PeriodRequest,
): Promise<PeriodChoices | undefined> => {
  const accounts = await listMovementAccounts(ctx);
  const account =
    accounts.find(({ id }) => id === request.accountId) ?? accounts[0];
  if (!account) return undefined;
  const unreconciled = (await listUnreconciledStatements(ctx)).filter(
    ({ accountId }) => accountId === account.id,
  );
  const counted = await listMovementQuarters(ctx, account.id);
  const quarters = quarterChoices(counted, unreconciled);
  const period = selectPeriod(request.period, quarters);
  return period && { accounts, account, quarters, period };
};
