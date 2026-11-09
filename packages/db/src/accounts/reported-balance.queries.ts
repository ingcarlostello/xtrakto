import type { AmountMinor, DatedBalance, LocalDate } from "@xtrakto/core";
import { and, asc, eq } from "drizzle-orm";
import type { UserContext } from "../user-context/user-context.types";
import type { AccountRow } from "./account.queries";
import { accounts } from "./account.schemas";

/**
 * Keeps the balance a person typed on their account (10.3), in place of the
 * one before. `false` for an account that isn't the context user's.
 */
export const saveReportedBalance = async (
  { tx, userId }: UserContext,
  accountId: string,
  { date, amountMinor }: DatedBalance,
): Promise<boolean> => {
  const saved = await tx
    .update(accounts)
    .set({ reportedBalanceMinor: amountMinor, reportedBalanceOn: date })
    .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)))
    .returning({ id: accounts.id });
  return saved.length > 0;
};

// Both columns or neither, as their CHECK keeps them.
const reportedOf = (
  date: LocalDate | null,
  amountMinor: AmountMinor | null,
): DatedBalance | undefined =>
  date === null || amountMinor === null ? undefined : { date, amountMinor };

/** The latest balance typed on the account; `undefined` until one was. */
export const findReportedBalance = async (
  { tx, userId }: UserContext,
  accountId: string,
): Promise<DatedBalance | undefined> => {
  const [found] = await tx
    .select({
      date: accounts.reportedBalanceOn,
      amountMinor: accounts.reportedBalanceMinor,
    })
    .from(accounts)
    .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)));
  return found && reportedOf(found.date, found.amountMinor);
};

/** A balance typed on an account, as the export of a person's data lists it. */
export type ExportReportedBalance = DatedBalance &
  Pick<AccountRow, "bankId" | "accountType"> & {
    readonly accountLast4: string | null;
  };

/** The balance typed on each of the context user's accounts that has one. */
export const listReportedBalances = async ({
  tx,
  userId,
}: UserContext): Promise<ExportReportedBalance[]> => {
  const rows = await tx
    .select({
      bankId: accounts.bankId,
      accountType: accounts.accountType,
      accountLast4: accounts.last4,
      date: accounts.reportedBalanceOn,
      amountMinor: accounts.reportedBalanceMinor,
    })
    .from(accounts)
    .where(eq(accounts.userId, userId))
    .orderBy(asc(accounts.createdAt), asc(accounts.id));
  return rows.flatMap(({ date, amountMinor, ...account }) => {
    const reported = reportedOf(date, amountMinor);
    return reported ? [{ ...account, ...reported }] : [];
  });
};
