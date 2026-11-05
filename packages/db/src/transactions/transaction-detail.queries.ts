import type {
  CategorySource,
  LocalDate,
  Period,
  ReferenceKind,
} from "@xtrakto/core";
import { and, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { countedMovement } from "../coverage/coverage.queries";
import { statements } from "../statements/statement.schemas";
import type { UserContext } from "../user-context/user-context.types";
import {
  LIST_ITEM_COLUMNS,
  type TransactionListItem,
} from "./transaction.queries";
import { transactions } from "./transaction.schemas";

/** A file that saved a movement: its format and its period. */
export type MovementFile = {
  readonly formatId: string;
  readonly period: Period;
};

/**
 * The movement of a movements file that repeats one of a verified quarterly
 * statement's, hidden behind it (10.1a): how that file wrote it, and the
 * file. Every other file that brought it saved nothing, by its fingerprint.
 */
export type MovementTwin = {
  readonly descriptionRaw: string;
  readonly descriptionNormalized: string;
  readonly statement: MovementFile;
};

/**
 * A movement as its detail shows it (docs/ui/v8-03): what the list shows,
 * the digits its reference kept, who gave its category, the statement it
 * was saved from, and the movement of another file that repeats it.
 */
export type MovementDetail = TransactionListItem & {
  /** Its text as rules read it, which a rule for its text compares (6.3g). */
  readonly descriptionNormalized: string;
  /** The number it went to or came from, as its HMAC, which a rule names (6.3h). */
  readonly referenceHash: string | null;
  readonly referenceKind: ReferenceKind | null;
  /** The last 4 digits of the number it went to or came from, when it had one. */
  readonly referenceLast4: string | null;
  readonly categorySource: CategorySource | null;
  readonly statement: MovementFile;
  /** `null` when no movements file repeats it (10.1c). */
  readonly twin: MovementTwin | null;
};

// The hidden movement that repeats the one detailed, and its statement.
const twin = alias(transactions, "twin");
const twinIn = alias(statements, "twin_statement");

const DETAIL_COLUMNS = {
  ...LIST_ITEM_COLUMNS,
  descriptionNormalized: transactions.descriptionNormalized,
  referenceHash: transactions.referenceHash,
  referenceKind: transactions.referenceKind,
  referenceLast4: transactions.referenceLast4,
  categorySource: transactions.categorySource,
  formatId: statements.formatId,
  from: statements.periodFrom,
  to: statements.periodTo,
  // One object per table, so each is null without its row.
  twinText: {
    raw: twin.descriptionRaw,
    normalized: twin.descriptionNormalized,
  },
  twinFile: {
    formatId: twinIn.formatId,
    from: twinIn.periodFrom,
    to: twinIn.periodTo,
  },
};

const twinOf = (
  text: { readonly raw: string; readonly normalized: string } | null,
  file: {
    readonly formatId: string;
    readonly from: LocalDate;
    readonly to: LocalDate;
  } | null,
): MovementTwin | null =>
  text === null || file === null
    ? null
    : {
        descriptionRaw: text.raw,
        descriptionNormalized: text.normalized,
        statement: {
          formatId: file.formatId,
          period: { from: file.from, to: file.to },
        },
      };

/**
 * One of an account's movements that count, with its detail. `undefined`
 * when the account has no such movement, or it counts nowhere.
 */
export const findMovementDetail = async (
  { tx, userId }: UserContext,
  {
    accountId,
    movementId,
  }: { readonly accountId: string; readonly movementId: string },
): Promise<MovementDetail | undefined> => {
  const [row] = await tx
    .select(DETAIL_COLUMNS)
    .from(transactions)
    .innerJoin(statements, eq(statements.id, transactions.statementId))
    .leftJoin(
      twin,
      and(
        eq(twin.matchedTransactionId, transactions.id),
        eq(twin.userId, userId),
      ),
    )
    .leftJoin(twinIn, eq(twinIn.id, twin.statementId))
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.accountId, accountId),
        eq(transactions.id, movementId),
        countedMovement,
      ),
    )
    .limit(1);
  if (!row) return undefined;
  const { formatId, from, to, twinText, twinFile, ...movement } = row;
  return {
    ...movement,
    statement: { formatId, period: { from, to } },
    twin: twinOf(twinText, twinFile),
  };
};
