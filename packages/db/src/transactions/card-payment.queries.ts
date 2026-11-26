import {
  ACCOUNT_TYPE,
  type CardPaymentLink,
  type CardPaymentSide,
  type LocalDate,
  type Period,
} from "@xtrakto/core";
import {
  and,
  asc,
  eq,
  gte,
  isNull,
  lte,
  ne,
  notExists,
  sql,
} from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { AccountRow } from "../accounts/account.queries";
import { accounts } from "../accounts/account.schemas";
import { countedMovement } from "../coverage/coverage.queries";
import { statements } from "../statements/statement.schemas";
import type { UserContext } from "../user-context/user-context.types";
import { transactions } from "./transaction.schemas";

const CARD_PAYMENT = "credit_card_payment";

// Another movement of the user's, which pairs with one of the query's.
const other = alias(transactions, "paired_movement");
const otherAccount = alias(accounts, "paired_account");

/** What the user's payments to their cards have to pair (12.3e). */
export type CardPaymentCandidates = {
  /** The payments to a card from any other account, not paired yet. */
  readonly payments: readonly CardPaymentSide[];
  /** The payments a card received that no payment points at yet. */
  readonly received: readonly CardPaymentSide[];
};

const SIDE_COLUMNS = {
  id: transactions.id,
  date: transactions.date,
  amountMinor: transactions.amountMinor,
};

// The user's movements that count of a card payment's category, of the
// accounts the condition says, the oldest first.
const listSides = (
  { tx, userId }: UserContext,
  where: ReturnType<typeof and>,
) =>
  tx
    .select(SIDE_COLUMNS)
    .from(transactions)
    .innerJoin(statements, eq(statements.id, transactions.statementId))
    .innerJoin(accounts, eq(accounts.id, transactions.accountId))
    .where(
      and(
        eq(transactions.userId, userId),
        countedMovement,
        eq(transactions.categoryId, CARD_PAYMENT),
        where,
      ),
    )
    .orderBy(asc(transactions.date), asc(transactions.position));

/**
 * The user's payments to their cards that haven't met the card's movement
 * that received them, and the cards' payments that no payment points at
 * yet, whenever their statements were saved (12.3e).
 */
export const listCardPaymentCandidates = async (
  ctx: UserContext,
): Promise<CardPaymentCandidates> => ({
  payments: await listSides(
    ctx,
    and(
      ne(accounts.accountType, ACCOUNT_TYPE.CREDIT_CARD),
      sql`${transactions.amountMinor} < 0`,
      isNull(transactions.paidCardMovementId),
    ),
  ),
  received: await listSides(
    ctx,
    and(
      eq(accounts.accountType, ACCOUNT_TYPE.CREDIT_CARD),
      sql`${transactions.amountMinor} > 0`,
      notExists(
        ctx.tx
          .select({ id: other.id })
          .from(other)
          .where(
            and(
              eq(other.userId, ctx.userId),
              eq(other.paidCardMovementId, transactions.id),
            ),
          ),
      ),
    ),
  ),
});

/**
 * Points each payment to a card at the card's movement that received it
 * (12.3e). A paired payment is the user's own: it waits for no review.
 */
export const linkCardPayments = async (
  { tx, userId }: UserContext,
  links: readonly CardPaymentLink[],
): Promise<void> => {
  if (links.length === 0) return;
  const pairs = sql.join(
    links.map(
      ({ paymentId, receivedId }) =>
        sql`(${paymentId}::uuid, ${receivedId}::uuid)`,
    ),
    sql`, `,
  );
  await tx
    .update(transactions)
    .set({
      paidCardMovementId: sql`link.received_id`,
      isPendingReview: false,
    })
    .from(sql`(values ${pairs}) as link(payment_id, received_id)`)
    .where(
      and(
        eq(transactions.userId, userId),
        sql`${transactions.id} = link.payment_id`,
      ),
    );
};

/** The other side of a payment to a card, as a movement's detail names it (12.3e). */
export type CardPaymentPair = {
  /** "to" from a payment to the card it reached; "from" on the card, to where it came from. */
  readonly direction: "to" | "from";
  readonly movementId: string;
  readonly date: LocalDate;
  readonly account: AccountRow;
};

const PAIR_COLUMNS = {
  movementId: other.id,
  date: other.date,
  account: {
    id: otherAccount.id,
    bankId: otherAccount.bankId,
    accountType: otherAccount.accountType,
    last4: otherAccount.last4,
  },
};

// The paired movement the condition joins, with its account.
const findPaired = async (
  { tx, userId }: UserContext,
  movementId: string,
  joinedOn: ReturnType<typeof and>,
) => {
  const [row] = await tx
    .select(PAIR_COLUMNS)
    .from(transactions)
    .innerJoin(other, and(eq(other.userId, userId), joinedOn))
    .innerJoin(otherAccount, eq(otherAccount.id, other.accountId))
    .where(
      and(eq(transactions.userId, userId), eq(transactions.id, movementId)),
    )
    .limit(1);
  return row;
};

/**
 * The other side of a payment to a card: the card's movement a payment
 * reached, or the payment a card's movement came from, with its account.
 * `undefined` for any other movement, or one not paired.
 */
export const findCardPaymentPair = async (
  ctx: UserContext,
  movementId: string,
): Promise<CardPaymentPair | undefined> => {
  const reached = await findPaired(
    ctx,
    movementId,
    eq(other.id, transactions.paidCardMovementId),
  );
  if (reached) return { direction: "to", ...reached };
  const came = await findPaired(
    ctx,
    movementId,
    eq(other.paidCardMovementId, transactions.id),
  );
  return came && { direction: "from", ...came };
};

/**
 * The cards an account's payments on the period's days reached, by their
 * pairs (12.3e), each once, in a stable order.
 */
export const listPaidCards = async (
  { tx, userId }: UserContext,
  {
    accountId,
    period,
  }: { readonly accountId: string; readonly period: Period },
): Promise<AccountRow[]> =>
  tx
    .selectDistinct(PAIR_COLUMNS.account)
    .from(transactions)
    .innerJoin(
      other,
      and(
        eq(other.userId, userId),
        eq(other.id, transactions.paidCardMovementId),
      ),
    )
    .innerJoin(otherAccount, eq(otherAccount.id, other.accountId))
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.accountId, accountId),
        gte(transactions.date, period.from),
        lte(transactions.date, period.to),
      ),
    )
    .orderBy(asc(otherAccount.id));
