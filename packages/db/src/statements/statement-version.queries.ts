import type { PreparedStatement } from "@xtrakto/core";
import { and, eq, isNotNull } from "drizzle-orm";
import type { UserContext } from "../user-context/user-context.types";
import { statements } from "./statement.schemas";

/** What a statement finds among the saved versions of its period. */
export type PeriodVersion =
  /** None, the same statement, or a statement without balances. */
  | { readonly kind: "free" }
  /** A version that reconciles stays, and keeps this one out. */
  | { readonly kind: "kept"; readonly statementId: string }
  /** A version that didn't reconcile was deleted for this one. */
  | { readonly kind: "replaced" };

/**
 * Settles a statement with balances against the saved version of its period
 * (ADR 0018): the same content is the same statement; a version that
 * reconciles keeps this one out; one that doesn't is deleted, movements
 * included, for this one to take its place. A statement without balances,
 * such as a movements export, has no versions: overlapping ranges are normal.
 */
export const settlePeriodVersion = async (
  { tx, userId }: UserContext,
  accountId: string,
  statement: PreparedStatement,
): Promise<PeriodVersion> => {
  if (statement.openingBalanceMinor === undefined) return { kind: "free" };
  const [saved] = await tx
    .select({
      id: statements.id,
      contentHash: statements.contentHash,
      balanceVerified: statements.balanceVerified,
    })
    .from(statements)
    .where(
      and(
        eq(statements.userId, userId),
        eq(statements.accountId, accountId),
        eq(statements.periodFrom, statement.period.from),
        eq(statements.periodTo, statement.period.to),
        isNotNull(statements.openingBalanceMinor),
      ),
    );
  if (!saved || saved.contentHash === statement.contentHash) {
    return { kind: "free" };
  }
  if (saved.balanceVerified) return { kind: "kept", statementId: saved.id };
  await tx
    .delete(statements)
    .where(and(eq(statements.id, saved.id), eq(statements.userId, userId)));
  return { kind: "replaced" };
};
