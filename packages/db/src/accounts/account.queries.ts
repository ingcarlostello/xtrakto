import type { AccountType, Currency } from "@xtrakto/core";
import { and, asc, eq } from "drizzle-orm";
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

/** An account the statement identifies by its last four digits. */
export type IdentifiedAccount = {
  readonly bankId: string;
  readonly accountType: AccountType;
  readonly last4: string;
  readonly currency: Currency;
};

/** The user's account with these bank, type and last4, created if missing. */
export const findOrCreateAccount = async (
  { tx, userId }: UserContext,
  account: IdentifiedAccount,
): Promise<string> => {
  const [created] = await tx
    .insert(accounts)
    .values({ userId, ...account })
    .onConflictDoNothing({
      target: [
        accounts.userId,
        accounts.bankId,
        accounts.accountType,
        accounts.last4,
      ],
    })
    .returning({ id: accounts.id });
  if (created) return created.id;
  const [existing] = await tx
    .select({ id: accounts.id })
    .from(accounts)
    .where(
      and(
        eq(accounts.userId, userId),
        eq(accounts.bankId, account.bankId),
        eq(accounts.accountType, account.accountType),
        eq(accounts.last4, account.last4),
      ),
    );
  if (!existing)
    throw new Error("An account conflicted but can't be read back.");
  return existing.id;
};
