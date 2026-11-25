import { type CategorizedStatement, isWithinPeriod } from "@xtrakto/core";
import { and, eq } from "drizzle-orm";
import { transactions } from "../transactions/transaction.schemas";
import type { UserContext } from "../user-context/user-context.types";

/** A statement just saved, with its account and user. */
export type SavedOwner = {
  readonly userId: string;
  readonly accountId: string;
  readonly statementId: string;
};

/** What a save just did: the statement, and the movements it inserted. */
export type StatementSave = {
  readonly statement: CategorizedStatement;
  /** Their fingerprints. */
  readonly inserted: ReadonlySet<string>;
};

/**
 * A card's movement belongs to the statement of its own period (12.3a, ADR
 * 0040): one that a later statement listed again, and saved before this one
 * came, comes back to it, in its place among this statement's movements. In
 * either upload order, its own statement then says whether it counts.
 */
export const claimOwnPeriod = async (
  { tx, userId }: UserContext,
  owner: SavedOwner,
  { statement, inserted }: StatementSave,
): Promise<void> => {
  if (statement.card === undefined) return;
  const savedBefore = statement.transactions.filter(
    ({ date, fingerprint }) =>
      !inserted.has(fingerprint) && isWithinPeriod(date, statement.period),
  );
  for (const { fingerprint, position } of savedBefore) {
    await tx
      .update(transactions)
      .set({ statementId: owner.statementId, position })
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.accountId, owner.accountId),
          eq(transactions.fingerprint, fingerprint),
        ),
      );
  }
};
