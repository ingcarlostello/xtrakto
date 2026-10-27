import "server-only";
import {
  DEFAULT_TIME_ZONE,
  descriptionRuleFor,
  kindTotalsOf,
  localDateFromInstant,
  type Period,
} from "@xtrakto/core";
import {
  countCountedMovements,
  countMovementsOfRule,
  findMovementDetail,
  findStatementBreaks,
  findUserId,
  listAccounts,
  listCategoryTotals,
  listExportMovements,
  listMovementAccounts,
  listMovementQuarters,
  listTransactions,
  listUnreconciledStatements,
  listUserCategoryRules,
  type StatementBreaks,
  type UnreconciledStatement,
  type UserContext,
  withUserContext,
} from "@xtrakto/db";
import {
  quarterChoices,
  selectPeriod,
} from "@/components/period-controls/period-choices.helpers";
import { getDb } from "@/lib/db";
import { type CsvFile, movementsCsv } from "@/utils/movements-csv.helpers";
import { periodDays } from "@/utils/transactions-url.helpers";
import { meetsPeriod } from "./period-selector.helpers";
import { selectionOf } from "./kind-view.helpers";
import { rulesOfMovement } from "./own-rules.helpers";
import { movementList, movementSearchOf } from "./transaction-list.helpers";
import {
  DEFAULT_CATEGORY_OF_KIND,
  MOVEMENTS_CSV_NAME,
} from "./transaction.constants";
import type {
  AccountTransactions,
  OpenMovement,
  TransactionsRequest,
} from "./transaction.types";

/** This year in Bogotá, which day headings leave out. */
export const currentYearInBogota = (): string =>
  localDateFromInstant(new Date(), DEFAULT_TIME_ZONE).slice(0, 4);

// What the list shows, without how many lines or which detail.
type ListRequest = Omit<TransactionsRequest, "shown" | "movementId">;

type Located = Pick<
  AccountTransactions,
  "accounts" | "account" | "quarters" | "period" | "unreconciled"
>;

// The accounts with something to show: movements that count, the latest
// first, then those whose only statements don't reconcile.
const listShownAccounts = async (
  ctx: UserContext,
  unreconciled: readonly UnreconciledStatement[],
) => {
  const withMovements = await listMovementAccounts(ctx);
  const others = (await listAccounts(ctx)).filter(
    ({ id }) =>
      !withMovements.some((account) => account.id === id) &&
      unreconciled.some(({ accountId }) => accountId === id),
  );
  return [...withMovements, ...others];
};

// The account and the period to show: those the URL asks when they're the
// user's and have something to show, else the latest; and the account's
// statements that don't reconcile on the period's days.
const locate = async (
  ctx: UserContext,
  request: ListRequest,
): Promise<Located | undefined> => {
  const allUnreconciled = await listUnreconciledStatements(ctx);
  const accounts = await listShownAccounts(ctx, allUnreconciled);
  const account =
    accounts.find(({ id }) => id === request.accountId) ?? accounts[0];
  if (!account) return undefined;
  const unreconciled = allUnreconciled.filter(
    ({ accountId }) => accountId === account.id,
  );
  const counted = await listMovementQuarters(ctx, account.id);
  const quarters = quarterChoices(counted, unreconciled);
  const period = selectPeriod(request.period, quarters);
  if (!period) return undefined;
  const days = periodDays(period);
  return {
    accounts,
    account,
    quarters,
    period,
    unreconciled: unreconciled.filter((s) => meetsPeriod(s.period, days)),
  };
};

// The movement the URL details, when it's one of the account's that count,
// and how many others a rule for its text would change. Which movements a
// text's rule holds for doesn't depend on its category.
const detailOf = async (
  ctx: UserContext,
  accountId: string,
  movementId: string | undefined,
): Promise<OpenMovement | null> => {
  if (movementId === undefined) return null;
  const movement = await findMovementDetail(ctx, { accountId, movementId });
  if (!movement) return null;
  const rule = descriptionRuleFor(movement, DEFAULT_CATEGORY_OF_KIND.spending);
  return {
    movement,
    similar:
      rule === null ? null : await countMovementsOfRule(ctx, rule, movement.id),
    rules: rulesOfMovement(movement, await listUserCategoryRules(ctx)),
  };
};

// What the list shows of the account's period: its search, and its filter
// or category. A category's movements are of one kind: no filter goes with
// them.
const listedIn = (
  { account, period }: Located,
  { search, category, filter }: ListRequest,
) => {
  const shownFilter = category === undefined ? filter : undefined;
  return {
    filter: shownFilter,
    shownPeriod: { accountId: account.id, period: periodDays(period) },
    selection: {
      ...(search === undefined ? {} : { search: movementSearchOf(search) }),
      ...selectionOf(shownFilter, category),
    },
  };
};

// The tiles and "Por revisar · 24" add up the whole period, whatever the
// list shows of it.
const periodKinds = async (
  ctx: UserContext,
  shownPeriod: { readonly accountId: string; readonly period: Period },
): Promise<Pick<AccountTransactions, "kindTotals" | "pendingReview">> => ({
  kindTotals: kindTotalsOf(await listCategoryTotals(ctx, shownPeriod)),
  pendingReview: await countCountedMovements(ctx, {
    ...shownPeriod,
    isPendingReview: true,
  }),
});

/**
 * The signed-in user's movements that count, newest first, in the account
 * and period the URL asks, or the latest, matching its search, filter or
 * category when there's one, in as many lines as the URL asks, each month's
 * daily interest in one line, and the detail of the movement it asks, when
 * it's the account's.
 * `null` until a movement counts or a statement doesn't reconcile; reading
 * never creates the user's row. The Clerk id must come from the session.
 */
export const getAccountTransactions = async (
  clerkUserId: string,
  request: TransactionsRequest,
): Promise<AccountTransactions | null> => {
  const db = getDb();
  const userId = await findUserId(db, clerkUserId);
  if (!userId) return null;
  const currentYear = currentYearInBogota();
  return withUserContext(db, userId, async (ctx) => {
    const located = await locate(ctx, request);
    if (!located) return null;
    const { search, category } = request;
    const { filter, shownPeriod, selection } = listedIn(located, request);
    // Every movement of the period: a month's interest line adds up all of
    // its abonos, and each day's balance comes from all of its movements.
    const { items } = await listTransactions(ctx, {
      ...shownPeriod,
      ...selection,
      offset: 0,
    });
    return {
      ...located,
      total: items.length,
      list: movementList(items, request.shown),
      ...(search === undefined ? {} : { search }),
      ...(filter === undefined ? {} : { filter }),
      ...(category === undefined ? {} : { category }),
      ...(await periodKinds(ctx, shownPeriod)),
      detail: await detailOf(ctx, located.account.id, request.movementId),
      currentYear,
    };
  });
};

/**
 * What the movements list shows, as a CSV (7.6): the account and period the
 * request asks, or the latest, with its search, filter or category, every
 * movement on its own line, oldest first. `null` when the list would show
 * nothing. The Clerk id must come from the session.
 */
export const getMovementsCsv = async (
  clerkUserId: string,
  request: ListRequest,
): Promise<CsvFile | null> => {
  const db = getDb();
  const userId = await findUserId(db, clerkUserId);
  if (!userId) return null;
  return withUserContext(db, userId, async (ctx) => {
    const located = await locate(ctx, request);
    if (!located) return null;
    const { shownPeriod, selection } = listedIn(located, request);
    const movements = await listExportMovements(ctx, {
      countedIn: shownPeriod,
      ...selection,
    });
    const { from, to } = shownPeriod.period;
    return {
      fileName: `${MOVEMENTS_CSV_NAME}-${from}-a-${to}.csv`,
      content: movementsCsv(movements, { withCounts: false }),
    };
  });
};

/** The signed-in user's latest statement that doesn't reconcile, if any. */
export const findUnreconciledStatement = async (
  clerkUserId: string,
): Promise<UnreconciledStatement | null> => {
  const db = getDb();
  const userId = await findUserId(db, clerkUserId);
  if (!userId) return null;
  const [latest] = await withUserContext(db, userId, (ctx) =>
    listUnreconciledStatements(ctx),
  );
  return latest ?? null;
};

/**
 * One of the signed-in user's statements that don't reconcile, with all its
 * movements. `null` when it isn't theirs or reconciles.
 */
export const getStatementBreaks = async (
  clerkUserId: string,
  statementId: string,
): Promise<StatementBreaks | null> => {
  const db = getDb();
  const userId = await findUserId(db, clerkUserId);
  if (!userId) return null;
  const breaks = await withUserContext(db, userId, (ctx) =>
    findStatementBreaks(ctx, statementId),
  );
  return breaks ?? null;
};
