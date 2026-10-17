import {
  APP_ERROR_CODE,
  type AccountType,
  type Currency,
  err,
  ok,
  type Result,
} from "@xtrakto/core";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import type { UserContext } from "../user-context/user-context.types";
import { accounts } from "./account.schemas";

/** An account as screens list it; `last4` is null until a statement names it. */
export type AccountRow = {
  readonly id: string;
  readonly bankId: string;
  readonly accountType: AccountType;
  readonly last4: string | null;
};

/** The context user's accounts, oldest first. */
export const listAccounts = ({
  tx,
  userId,
}: UserContext): Promise<AccountRow[]> =>
  tx
    .select({
      id: accounts.id,
      bankId: accounts.bankId,
      accountType: accounts.accountType,
      last4: accounts.last4,
    })
    .from(accounts)
    .where(eq(accounts.userId, userId))
    .orderBy(asc(accounts.createdAt), asc(accounts.id));

/**
 * The account's holder name, as a quarterly statement printed it and
 * `normalizeHolderName` wrote it: what the rules compare transfers with.
 * `undefined` until one did, or for an account that isn't the user's.
 */
export const findAccountHolderName = async (
  { tx, userId }: UserContext,
  accountId: string,
): Promise<string | undefined> => {
  const [found] = await tx
    .select({ holderName: accounts.holderNameNormalized })
    .from(accounts)
    .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)));
  return found?.holderName ?? undefined;
};

/** What any statement says about its account. */
export type AccountKind = {
  readonly bankId: string;
  readonly accountType: AccountType;
  readonly currency: Currency;
};

/** An account a statement identifies by its last four digits. */
export type IdentifiedAccount = AccountKind & {
  readonly last4: string;
  /** The holder's name as `normalizeHolderName` writes it, when printed. */
  readonly holderNameNormalized?: string;
};

const ofKind = (userId: string, { bankId, accountType }: AccountKind) =>
  and(
    eq(accounts.userId, userId),
    eq(accounts.bankId, bankId),
    eq(accounts.accountType, accountType),
  );

const findNumbered = async (
  { tx, userId }: UserContext,
  account: IdentifiedAccount,
): Promise<string | undefined> => {
  const [found] = await tx
    .select({ id: accounts.id })
    .from(accounts)
    .where(and(ofKind(userId, account), eq(accounts.last4, account.last4)));
  return found?.id;
};

// A movements export processed before any quarterly statement created it.
const adoptUnnumbered = async (
  { tx, userId }: UserContext,
  account: IdentifiedAccount,
): Promise<string | undefined> => {
  const [adopted] = await tx
    .update(accounts)
    .set({ last4: account.last4 })
    .where(and(ofKind(userId, account), isNull(accounts.last4)))
    .returning({ id: accounts.id });
  return adopted?.id;
};

// Insert first, then read: if two jobs race, one inserts and both read it.
const createNumbered = async (
  ctx: UserContext,
  account: IdentifiedAccount,
): Promise<string> => {
  const { bankId, accountType, currency, last4 } = account;
  const [created] = await ctx.tx
    .insert(accounts)
    .values({ userId: ctx.userId, bankId, accountType, currency, last4 })
    .onConflictDoNothing({
      target: [
        accounts.userId,
        accounts.bankId,
        accounts.accountType,
        accounts.last4,
      ],
    })
    .returning({ id: accounts.id });
  const id = created?.id ?? (await findNumbered(ctx, account));
  if (!id) throw new Error("An account conflicted but can't be read back.");
  return id;
};

/**
 * The account a statement names by its last four digits: the user's account
 * with those digits; else the only one without a number of its bank and
 * type, which takes the digits; else a new one. Keeps the holder's name.
 */
export const resolveIdentifiedAccount = async (
  ctx: UserContext,
  account: IdentifiedAccount,
): Promise<string> => {
  const id =
    (await findNumbered(ctx, account)) ??
    (await adoptUnnumbered(ctx, account)) ??
    (await createNumbered(ctx, account));
  if (account.holderNameNormalized !== undefined) {
    await ctx.tx
      .update(accounts)
      .set({ holderNameNormalized: account.holderNameNormalized })
      .where(and(eq(accounts.id, id), eq(accounts.userId, ctx.userId)));
  }
  return id;
};

/**
 * The account of a statement that names none, such as a movements export
 * sent without one: the user's only account of its bank and type, or a new
 * one without a number when they have none. With several, the user has to
 * choose: `ACCOUNT_REQUIRED`.
 */
export const resolveUnidentifiedAccount = async (
  { tx, userId }: UserContext,
  kind: AccountKind,
): Promise<Result<string>> => {
  const owned = await tx
    .select({ id: accounts.id })
    .from(accounts)
    .where(ofKind(userId, kind))
    .limit(2);
  if (owned.length > 1) return err({ code: APP_ERROR_CODE.ACCOUNT_REQUIRED });
  if (owned[0]) return ok(owned[0].id);
  const [created] = await tx
    .insert(accounts)
    .values({ userId, ...kind })
    .onConflictDoNothing({
      target: [accounts.userId, accounts.bankId, accounts.accountType],
      where: sql`${accounts.last4} is null`,
    })
    .returning({ id: accounts.id });
  if (!created)
    throw new Error("An account conflicted but can't be read back.");
  return ok(created.id);
};
