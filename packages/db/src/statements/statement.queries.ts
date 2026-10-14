import {
  APP_ERROR_CODE,
  err,
  ok,
  type PreparedStatement,
  type Result,
} from "@xtrakto/core";
import { and, eq } from "drizzle-orm";
import { accounts } from "../accounts/account.schemas";
import {
  countCountedMovements,
  coveringStatementOf,
  coveringStatements,
  hideOtherFormats,
} from "../coverage/coverage.queries";
import { transactions } from "../transactions/transaction.schemas";
import type { UserContext } from "../user-context/user-context.types";
import { settlePeriodVersion } from "./statement-version.queries";
import { statements } from "./statement.schemas";
import type { SavedStatement, SaveStatementInput } from "./statement.types";

// Well under PostgreSQL's 65,535 bind parameters per statement (20 columns).
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

const statementRow = (
  owner: Owner,
  { statement, balance }: SaveStatementInput,
) => ({
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
  balanceVerified: balance.verified,
  balanceDifferenceMinor: balance.differenceMinor,
  balanceBreakPositions: [...balance.breakPositions],
  contentHash: statement.contentHash,
});

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

// Movements already in the account, from any upload, are skipped by
// fingerprint. A movement of a statement without balances on a verified
// quarterly statement's days is saved hidden under it.
const insertMovements = async (
  ctx: UserContext,
  owner: Owner & { readonly statementId: string },
  statement: PreparedStatement,
): Promise<{ readonly inserted: number; readonly covered: number }> => {
  const covering =
    statement.openingBalanceMinor === undefined
      ? await coveringStatements(ctx, owner.accountId, statement.period)
      : [];
  const rows = statement.transactions.map((movement) => ({
    ...owner,
    ...movement,
    coveredByStatementId: coveringStatementOf(covering, movement.date),
  }));
  let inserted = 0;
  let covered = 0;
  for (let start = 0; start < rows.length; start += INSERT_CHUNK_SIZE) {
    const added = await ctx.tx
      .insert(transactions)
      .values(rows.slice(start, start + INSERT_CHUNK_SIZE))
      .onConflictDoNothing({
        target: [transactions.accountId, transactions.fingerprint],
      })
      .returning({ coveredBy: transactions.coveredByStatementId });
    inserted += added.length;
    covered += added.filter(({ coveredBy }) => coveredBy !== null).length;
  }
  return { inserted, covered };
};

// Once verified, a statement with balances hides the other format's
// movements saved before it on its days.
const hideUnderVerified = (
  ctx: UserContext,
  statementId: string,
  { accountId, statement, balance }: SaveStatementInput,
): Promise<number> =>
  balance.verified && statement.openingBalanceMinor !== undefined
    ? hideOtherFormats(ctx, accountId, {
        statementId,
        after: statement.period.from,
        through: statement.period.to,
      })
    : Promise.resolve(0);

const nothingSaved = (statementId: string, total: number): SavedStatement => ({
  statementId,
  total,
  added: 0,
  skipped: total,
  covered: 0,
  hidden: 0,
  replaced: 0,
});

/**
 * Saves a statement and its movements in the user's account, idempotently,
 * and says what it changed. Saving the same statement again adds nothing; an
 * overlapping upload adds only the movements the account doesn't have. A
 * statement with balances follows the rules of its period's versions, and
 * once verified hides the other format's movements on its days, saved before
 * or after it (ADR 0018). `added` is the exact change in movements that
 * count. Run it inside `withUserContext`, whose transaction makes the save
 * all or nothing.
 */
export const saveStatement = async (
  ctx: UserContext,
  input: SaveStatementInput,
): Promise<Result<SavedStatement>> => {
  const { accountId, statement } = input;
  if (!(await ownsAccount(ctx, accountId)))
    return err({ code: APP_ERROR_CODE.NOT_FOUND });
  assertUniqueFingerprints(statement);
  const owner = { userId: ctx.userId, accountId };
  const total = statement.transactions.length;
  const version = await settlePeriodVersion(ctx, accountId, statement);
  if (version.kind === "kept")
    return ok(nothingSaved(version.statementId, total));
  const saved = await upsertStatement(ctx, owner, input);
  // Saved before in one transaction, so all its movements were handled then.
  if (!saved.isNew) return ok(nothingSaved(saved.id, total));
  const countedBefore = await countCountedMovements(ctx, accountId);
  const { inserted, covered } = await insertMovements(
    ctx,
    { ...owner, statementId: saved.id },
    statement,
  );
  const hidden = await hideUnderVerified(ctx, saved.id, input);
  const added = (await countCountedMovements(ctx, accountId)) - countedBefore;
  const replaced = version.kind === "replaced" ? 1 : 0;
  return ok({
    statementId: saved.id,
    total,
    added,
    skipped: total - inserted,
    covered,
    hidden,
    replaced,
  });
};
