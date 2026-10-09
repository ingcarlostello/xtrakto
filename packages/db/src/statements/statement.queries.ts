import {
  APP_ERROR_CODE,
  err,
  ok,
  type PreparedStatement,
  type Result,
} from "@xtrakto/core";
import { and, eq } from "drizzle-orm";
import { accounts } from "../accounts/account.schemas";
import { transactions } from "../transactions/transaction.schemas";
import type { UserContext } from "../user-context/user-context.types";
import { statements } from "./statement.schemas";
import type { SavedStatement, SaveStatementInput } from "./statement.types";

// Well under PostgreSQL's 65,535 bind parameters per statement (18 columns).
const INSERT_CHUNK_SIZE = 1_000;

type Owner = { readonly userId: string; readonly accountId: string };

const ownsAccount = async (
  { tx, userId }: UserContext,
  accountId: string,
): Promise<boolean> => {
  const rows = await tx
    .select({ id: accounts.id })
    .from(accounts)
    .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)));
  return rows.length > 0;
};

// ON CONFLICT DO NOTHING would silently skip a repeated fingerprint as if it
// were already saved, losing a real movement: prepareStatement never repeats one.
const assertUniqueFingerprints = (statement: PreparedStatement): void => {
  const fingerprints = statement.transactions.map((t) => t.fingerprint);
  if (new Set(fingerprints).size !== fingerprints.length)
    throw new Error("A statement can't repeat a movement fingerprint.");
};

const statementRow = (owner: Owner, input: SaveStatementInput) => {
  const { statement } = input;
  return {
    ...owner,
    formatId: statement.formatId,
    periodFrom: statement.period.from,
    periodTo: statement.period.to,
    openingBalanceMinor: statement.openingBalanceMinor,
    closingBalanceMinor: statement.closingBalanceMinor,
    totalCreditsMinor: statement.totals?.creditsMinor,
    totalDebitsMinor: statement.totals?.debitsMinor,
    interestMinor: statement.totals?.interestMinor,
    withholdingMinor: statement.totals?.withholdingMinor,
    averageBalanceMinor: statement.totals?.averageBalanceMinor,
    balanceVerified: input.balanceVerified,
    contentHash: statement.contentHash,
  };
};

// The id of the statement with this content, inserted now or found saved
// before; `isNew` is false when it was already there.
const upsertStatement = async (
  { tx }: UserContext,
  owner: Owner,
  input: SaveStatementInput,
): Promise<{ readonly id: string; readonly isNew: boolean }> => {
  const [created] = await tx
    .insert(statements)
    .values(statementRow(owner, input))
    .onConflictDoNothing({
      target: [statements.accountId, statements.contentHash],
    })
    .returning({ id: statements.id });
  if (created) return { id: created.id, isNew: true };
  const [existing] = await tx
    .select({ id: statements.id })
    .from(statements)
    .where(
      and(
        eq(statements.accountId, owner.accountId),
        eq(statements.contentHash, input.statement.contentHash),
      ),
    );
  if (!existing)
    throw new Error("A statement conflicted but can't be read back.");
  return { id: existing.id, isNew: false };
};

// Movements already in the account, from any upload, are skipped by fingerprint.
const insertMovements = async (
  { tx }: UserContext,
  owner: Owner & { readonly statementId: string },
  statement: PreparedStatement,
): Promise<number> => {
  const rows = statement.transactions.map((movement) => ({
    ...owner,
    ...movement,
  }));
  let inserted = 0;
  for (let start = 0; start < rows.length; start += INSERT_CHUNK_SIZE) {
    const added = await tx
      .insert(transactions)
      .values(rows.slice(start, start + INSERT_CHUNK_SIZE))
      .onConflictDoNothing({
        target: [transactions.accountId, transactions.fingerprint],
      })
      .returning({ id: transactions.id });
    inserted += added.length;
  }
  return inserted;
};

/**
 * Saves a statement and its movements in the user's account, idempotently:
 * saving the same statement again inserts nothing, and an overlapping upload
 * inserts only the movements the account doesn't have. Checks the account
 * before writing; run it inside `withUserContext`, whose transaction makes the
 * save all or nothing.
 */
export const saveStatement = async (
  ctx: UserContext,
  input: SaveStatementInput,
): Promise<Result<SavedStatement>> => {
  if (!(await ownsAccount(ctx, input.accountId)))
    return err({ code: APP_ERROR_CODE.NOT_FOUND });
  assertUniqueFingerprints(input.statement);
  const owner = { userId: ctx.userId, accountId: input.accountId };
  const total = input.statement.transactions.length;
  const saved = await upsertStatement(ctx, owner, input);
  // Saved before in one transaction, so all its movements were handled then.
  if (!saved.isNew)
    return ok({ statementId: saved.id, inserted: 0, skipped: total });
  const inserted = await insertMovements(
    ctx,
    { ...owner, statementId: saved.id },
    input.statement,
  );
  return ok({ statementId: saved.id, inserted, skipped: total - inserted });
};
