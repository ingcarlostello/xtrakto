import "server-only";
import type { CalendarQuarter } from "@xtrakto/core";
import {
  listAccountCoverage,
  listMovementAccounts,
  listMovementQuarters,
  listUnreconciledStatements,
  type UserContext,
} from "@xtrakto/db";
import { monthsHad } from "@/components/coverage-timeline/coverage-timeline.helpers";
import {
  quarterChoices,
  selectPagePeriod,
  selectPeriod,
  yearChoices,
} from "./period-choices.helpers";
import type {
  PagePeriodChoices,
  PagePeriodRequest,
  PeriodChoices,
  PeriodRequest,
  YearChoice,
} from "./period-controls.types";

// The account the URL asks when it has movements, else the one with the
// latest, with its quarters to choose from.
const locateAccount = async (ctx: UserContext, accountId?: string) => {
  const accounts = await listMovementAccounts(ctx);
  const account = accounts.find(({ id }) => id === accountId) ?? accounts[0];
  if (!account) return undefined;
  const unreconciled = (await listUnreconciledStatements(ctx)).filter(
    (statement) => statement.accountId === account.id,
  );
  const counted = await listMovementQuarters(ctx, account.id);
  return { accounts, account, quarters: quarterChoices(counted, unreconciled) };
};

/**
 * The account and the period a page shows: those the URL asks when they're
 * the user's and have movements, else the account with the latest and its
 * latest quarter. `undefined` until a movement counts.
 */
export const locateAccountPeriod = async (
  ctx: UserContext,
  request: PeriodRequest,
): Promise<PeriodChoices | undefined> => {
  const located = await locateAccount(ctx, request.accountId);
  const period = located && selectPeriod(request.period, located.quarters);
  return located && period && { ...located, period };
};

/**
 * The years of an account's quarters, each with how many of its months the
 * account has, as its coverage timeline counts them (10.2a).
 */
export const listYearChoices = async (
  ctx: UserContext,
  accountId: string,
  quarters: readonly CalendarQuarter[],
): Promise<readonly YearChoice[]> => {
  const coverage = (await listAccountCoverage(ctx)).find(
    (account) => account.accountId === accountId,
  );
  return yearChoices(quarters, coverage ? monthsHad(coverage) : new Set());
};

/**
 * The same as `locateAccountPeriod`, for a page whose controls offer a year
 * too (10.2b): the year the URL asks, when the account has quarters in it.
 */
export const locatePagePeriod = async (
  ctx: UserContext,
  request: PagePeriodRequest,
): Promise<PagePeriodChoices | undefined> => {
  const located = await locateAccount(ctx, request.accountId);
  if (!located) return undefined;
  const period = selectPagePeriod(request.period, located.quarters);
  if (!period) return undefined;
  const { account, quarters } = located;
  const years = await listYearChoices(ctx, account.id, quarters);
  return { ...located, period, years };
};
