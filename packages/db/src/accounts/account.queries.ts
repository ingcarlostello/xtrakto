import type { AccountType, Currency } from "@xtrakto/core";
import { and, eq } from "drizzle-orm";
import type { UserContext } from "../user-context/user-context.types";
import { accounts } from "./account.schemas";

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
