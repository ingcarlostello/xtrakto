import {
  CATEGORIES,
  CATEGORY_SOURCE,
  type CategoryId,
  MONEY_DIRECTION,
  type MoneyDirection,
  referenceRuleDirection,
  type UserCategoryRule,
  userRuleTextOf,
} from "@xtrakto/core";
import {
  and,
  count,
  eq,
  inArray,
  ne,
  notExists,
  type SQL,
  sql,
} from "drizzle-orm";
import { countedMovement } from "../coverage/coverage.queries";
import { statements } from "../statements/statement.schemas";
import { transactions } from "../transactions/transaction.schemas";
import type { UserContext } from "../user-context/user-context.types";
import { userCategoryRules } from "./user-category-rule.schemas";

type DescriptionRule = Extract<UserCategoryRule, { target: "description" }>;
type ReferenceRule = Extract<UserCategoryRule, { target: "reference" }>;

export type RuleRow = Pick<
  typeof userCategoryRules.$inferSelect,
  | "descriptionFolded"
  | "direction"
  | "referenceHash"
  | "referenceLast4"
  | "categoryId"
>;

/**
 * A stored rule as the categorizer reads it. The CHECKs give every row a
 * text with its direction, or a reference.
 */
export const toUserCategoryRule = (row: RuleRow): UserCategoryRule => {
  if (row.referenceHash !== null)
    return {
      target: "reference",
      referenceHash: row.referenceHash,
      ...(row.referenceLast4 === null
        ? {}
        : { referenceLast4: row.referenceLast4 }),
      categoryId: row.categoryId,
    };
  if (row.descriptionFolded === null || row.direction === null)
    throw new Error("A user's category rule without a text or a reference.");
  return {
    target: "description",
    descriptionFolded: row.descriptionFolded,
    direction: row.direction,
    categoryId: row.categoryId,
  };
};

/** The user's rules, which ingestion passes to the categorizer. */
export const listUserCategoryRules = async ({
  tx,
  userId,
}: UserContext): Promise<UserCategoryRule[]> => {
  const rows = await tx
    .select({
      descriptionFolded: userCategoryRules.descriptionFolded,
      direction: userCategoryRules.direction,
      referenceHash: userCategoryRules.referenceHash,
      referenceLast4: userCategoryRules.referenceLast4,
      categoryId: userCategoryRules.categoryId,
    })
    .from(userCategoryRules)
    .where(eq(userCategoryRules.userId, userId));
  return rows.map(toUserCategoryRule);
};

const upsertReferenceRule = (
  { tx, userId }: UserContext,
  { referenceHash, referenceLast4, categoryId }: ReferenceRule,
) => {
  const last4 = referenceLast4 ?? null;
  return tx
    .insert(userCategoryRules)
    .values({ userId, referenceHash, referenceLast4: last4, categoryId })
    .onConflictDoUpdate({
      target: [userCategoryRules.userId, userCategoryRules.referenceHash],
      targetWhere: sql`${userCategoryRules.referenceHash} is not null`,
      set: { referenceLast4: last4, categoryId, updatedAt: sql`now()` },
    });
};

const upsertDescriptionRule = (
  { tx, userId }: UserContext,
  { descriptionFolded, direction, categoryId }: DescriptionRule,
) =>
  tx
    .insert(userCategoryRules)
    .values({ userId, descriptionFolded, direction, categoryId })
    .onConflictDoUpdate({
      target: [
        userCategoryRules.userId,
        userCategoryRules.direction,
        userCategoryRules.descriptionFolded,
      ],
      targetWhere: sql`${userCategoryRules.descriptionFolded} is not null`,
      set: { categoryId, updatedAt: sql`now()` },
    });

const goingWay = (direction: MoneyDirection | undefined): SQL => {
  if (direction === MONEY_DIRECTION.IN)
    return sql`${transactions.amountMinor} > 0`;
  if (direction === MONEY_DIRECTION.OUT)
    return sql`${transactions.amountMinor} < 0`;
  return sql`${transactions.amountMinor} <> 0`;
};

// The categories whose reference rules hold for money going this way.
const referenceCategoriesFor = (direction: MoneyDirection): CategoryId[] =>
  CATEGORIES.flatMap(({ id }) => {
    const holds = referenceRuleDirection(id);
    return holds === undefined || holds === direction ? [id] : [];
  });

// The movement's reference has a rule of the user's that holds for its way,
// which comes before any text's rule (ADR 0025).
const heldByReference = ({ tx }: UserContext, direction: MoneyDirection) =>
  tx
    .select({ held: sql`1` })
    .from(userCategoryRules)
    .where(
      and(
        eq(userCategoryRules.userId, transactions.userId),
        eq(userCategoryRules.referenceHash, transactions.referenceHash),
        inArray(
          userCategoryRules.categoryId,
          referenceCategoriesFor(direction),
        ),
      ),
    );

/**
 * The user's movements a rule holds for, or none. A reference's rule holds
 * the ways its category allows (ADR 0026). A text rule compares texts as
 * `userRuleTextOf` writes them, which SQL can't, so it reads the user's
 * distinct texts going that way first; it leaves what a reference's rule
 * says.
 */
export const movementsOfRule = async (
  ctx: UserContext,
  rule: UserCategoryRule,
): Promise<SQL | undefined> => {
  if (rule.target === "reference")
    return and(
      eq(transactions.referenceHash, rule.referenceHash),
      goingWay(referenceRuleDirection(rule.categoryId)),
    );
  const rows = await ctx.tx
    .selectDistinct({ description: transactions.descriptionNormalized })
    .from(transactions)
    .where(and(eq(transactions.userId, ctx.userId), goingWay(rule.direction)));
  const texts = rows
    .map(({ description }) => description)
    .filter((text) => userRuleTextOf(text) === rule.descriptionFolded);
  return texts.length === 0
    ? undefined
    : and(
        goingWay(rule.direction),
        inArray(transactions.descriptionNormalized, texts),
        notExists(heldByReference(ctx, rule.direction)),
      );
};

/** The user's category, as movements keep it: never a guess, the rule that guessed kept. */
export const usersCategory = (categoryId: CategoryId) => ({
  categoryId,
  categorySource: CATEGORY_SOURCE.USER,
  isPendingReview: false,
});

/**
 * How many of the user's movements that count a rule would give its
 * category to, in any statement, besides one: "Aplicar a los 3 parecidos".
 */
export const countMovementsOfRule = async (
  ctx: UserContext,
  rule: UserCategoryRule,
  exceptId: string,
): Promise<number> => {
  const matching = await movementsOfRule(ctx, rule);
  if (matching === undefined) return 0;
  const [row] = await ctx.tx
    .select({ movements: count() })
    .from(transactions)
    .innerJoin(statements, eq(statements.id, transactions.statementId))
    .where(
      and(
        eq(transactions.userId, ctx.userId),
        matching,
        countedMovement,
        ne(transactions.id, exceptId),
      ),
    );
  return row?.movements ?? 0;
};

/**
 * Saves the user's rule, replacing their earlier one for the same text and
 * direction or the same reference, and gives its category to every movement
 * of theirs it holds for, in any statement. Returns how many those are.
 */
export const saveUserCategoryRule = async (
  ctx: UserContext,
  rule: UserCategoryRule,
): Promise<number> => {
  await (rule.target === "reference"
    ? upsertReferenceRule(ctx, rule)
    : upsertDescriptionRule(ctx, rule));
  const matching = await movementsOfRule(ctx, rule);
  if (matching === undefined) return 0;
  const changed = await ctx.tx
    .update(transactions)
    .set(usersCategory(rule.categoryId))
    .where(and(eq(transactions.userId, ctx.userId), matching))
    .returning({ id: transactions.id });
  return changed.length;
};
