import type { LocalDate, MatchedMovement, MatchedUpdate } from "@xtrakto/core";
import {
  and,
  eq,
  inArray,
  isNotNull,
  isNull,
  notExists,
  sql,
} from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { transactions } from "../transactions/transaction.schemas";
import type { UserContext } from "../user-context/user-context.types";

// Well under PostgreSQL's 65,535 bind parameters per statement (8 a row).
const UPDATE_CHUNK_SIZE = 1_000;

/** A saved movement as matching reads it: its day, its place in its statement, and what it says. */
export type MatchCandidate = MatchedMovement & {
  readonly id: string;
  readonly date: LocalDate;
  readonly position: number;
};

/** The candidates of an account: hidden movements without a match, and those that count in the statements hiding them. */
export type MatchCandidates = {
  readonly hidden: readonly (MatchCandidate & {
    readonly coveredByStatementId: string;
  })[];
  readonly counted: readonly (MatchCandidate & {
    readonly statementId: string;
  })[];
};

/** A hidden movement, the one that counts that it repeats, and how that one changes. */
export type SavedMatch = {
  readonly hiddenId: string;
  readonly countedId: string;
  readonly update?: MatchedUpdate;
};

const CANDIDATE_COLUMNS = {
  id: transactions.id,
  date: transactions.date,
  position: transactions.position,
  descriptionNormalized: transactions.descriptionNormalized,
  amountMinor: transactions.amountMinor,
  referenceHash: transactions.referenceHash,
  referenceLast4: transactions.referenceLast4,
  referenceKind: transactions.referenceKind,
  categoryId: transactions.categoryId,
  categorySource: transactions.categorySource,
  categoryRuleId: transactions.categoryRuleId,
  llmCategoryId: transactions.llmCategoryId,
  isPendingReview: transactions.isPendingReview,
};

const listHidden = async (
  { tx, userId }: UserContext,
  accountId: string,
): Promise<MatchCandidates["hidden"]> => {
  const rows = await tx
    .select({
      ...CANDIDATE_COLUMNS,
      coveredByStatementId: transactions.coveredByStatementId,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.accountId, accountId),
        isNotNull(transactions.coveredByStatementId),
        isNull(transactions.matchedTransactionId),
      ),
    );
  return rows.flatMap(({ coveredByStatementId, ...row }) =>
    coveredByStatementId === null ? [] : [{ ...row, coveredByStatementId }],
  );
};

// The movements of those statements that no hidden movement repeats yet.
const listUnrepeated = (
  { tx, userId }: UserContext,
  statementIds: readonly string[],
): Promise<MatchCandidates["counted"]> => {
  const repeating = alias(transactions, "repeating");
  return tx
    .select({ ...CANDIDATE_COLUMNS, statementId: transactions.statementId })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        inArray(transactions.statementId, [...statementIds]),
        isNull(transactions.coveredByStatementId),
        notExists(
          tx
            .select({ id: repeating.id })
            .from(repeating)
            .where(
              and(
                eq(repeating.userId, userId),
                eq(repeating.matchedTransactionId, transactions.id),
              ),
            ),
        ),
      ),
    );
};

/**
 * What an account has to match (10.1a): its hidden movements without a
 * match, whenever they were saved, and the movements of the verified
 * quarterly statements hiding them that no hidden one repeats yet.
 */
export const listMatchCandidates = async (
  ctx: UserContext,
  accountId: string,
): Promise<MatchCandidates> => {
  const hidden = await listHidden(ctx, accountId);
  const statementIds = [
    ...new Set(hidden.map(({ coveredByStatementId }) => coveredByStatementId)),
  ];
  if (statementIds.length === 0) return { hidden, counted: [] };
  return { hidden, counted: await listUnrepeated(ctx, statementIds) };
};

const chunksOf = <T>(items: readonly T[]): T[][] =>
  Array.from({ length: Math.ceil(items.length / UPDATE_CHUNK_SIZE) }, (_, n) =>
    items.slice(n * UPDATE_CHUNK_SIZE, (n + 1) * UPDATE_CHUNK_SIZE),
  );

// Each hidden movement points at the one that counts that it repeats.
const linkMatches = async (
  { tx, userId }: UserContext,
  matches: readonly SavedMatch[],
): Promise<void> => {
  const pairs = sql.join(
    matches.map(
      ({ hiddenId, countedId }) => sql`(${hiddenId}::uuid, ${countedId}::uuid)`,
    ),
    sql`, `,
  );
  await tx
    .update(transactions)
    .set({ matchedTransactionId: sql`link.counted_id` })
    .from(sql`(values ${pairs}) as link(hidden_id, counted_id)`)
    .where(
      and(
        eq(transactions.userId, userId),
        sql`${transactions.id} = link.hidden_id`,
      ),
    );
};

// Each movement that counts, as its match leaves it.
const updateCounted = async (
  { tx, userId }: UserContext,
  updates: readonly { readonly id: string; readonly update: MatchedUpdate }[],
): Promise<void> => {
  const rows = sql.join(
    updates.map(
      ({ id, update }) =>
        sql`(${id}::uuid, ${update.referenceHash}::text, ${update.referenceLast4}::text, ${update.referenceKind}::text, ${update.categoryId}::text, ${update.categorySource}::text, ${update.categoryRuleId}::text, ${update.isPendingReview}::boolean)`,
    ),
    sql`, `,
  );
  await tx
    .update(transactions)
    .set({
      referenceHash: sql`changed.reference_hash`,
      referenceLast4: sql`changed.reference_last4`,
      referenceKind: sql`changed.reference_kind`,
      categoryId: sql`changed.category_id`,
      categorySource: sql`changed.category_source`,
      categoryRuleId: sql`changed.category_rule_id`,
      isPendingReview: sql`changed.pending_review`,
    })
    .from(
      sql`(values ${rows}) as changed(id, reference_hash, reference_last4, reference_kind, category_id, category_source, category_rule_id, pending_review)`,
    )
    .where(
      and(
        eq(transactions.userId, userId),
        sql`${transactions.id} = changed.id`,
      ),
    );
};

/**
 * Saves matches (10.1a): links each hidden movement to the one that counts
 * that it repeats, and leaves that one with its update, its reference and
 * category, when it has one. Run it in the transaction that saved the
 * statement.
 */
export const saveMatches = async (
  ctx: UserContext,
  matches: readonly SavedMatch[],
): Promise<void> => {
  for (const chunk of chunksOf(matches)) await linkMatches(ctx, chunk);
  const updates = matches.flatMap(({ countedId, update }) =>
    update === undefined ? [] : [{ id: countedId, update }],
  );
  for (const chunk of chunksOf(updates)) await updateCounted(ctx, chunk);
};
