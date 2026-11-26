import {
  type AmountMinor,
  type Period,
  type PreparedCard,
  preparedCardSchema,
} from "@xtrakto/core";
import { and, asc, eq, gte, isNotNull, lte } from "drizzle-orm";
import type { UserContext } from "../user-context/user-context.types";
import { statements } from "./statement.schemas";

/** A card's statement by its period, and whether its bank's sums check it. */
export type CardPeriod = {
  readonly period: Period;
  readonly isVerified: boolean;
};

/**
 * The periods of a card's statements, the oldest first, each with whether
 * it reconciles: the cycles a card's months are made of, each named by the
 * month it closes in (12.3c). One statement per period, as its versions
 * keep it.
 */
export const listCardPeriods = (
  { tx, userId }: UserContext,
  accountId: string,
): Promise<CardPeriod[]> =>
  tx
    .select({
      from: statements.periodFrom,
      to: statements.periodTo,
      isVerified: statements.balanceVerified,
    })
    .from(statements)
    .where(
      and(
        eq(statements.userId, userId),
        eq(statements.accountId, accountId),
        isNotNull(statements.card),
      ),
    )
    .orderBy(asc(statements.periodTo))
    .then((rows) =>
      rows.map(({ from, to, isVerified }) => ({
        period: { from, to },
        isVerified,
      })),
    );

/** A card statement's figures: what "Tu tarjeta" shows of its period (12.3c). */
export type CardFigures = CardPeriod & {
  /** Where its movements miss its bank's sums, when it doesn't reconcile. */
  readonly differenceMinor: AmountMinor | null;
  /** Its limit, what's due and by when, its bank's summary and the installments it charges. */
  readonly card: PreparedCard;
};

/**
 * The figures of a card's statements that close on the period's days, the
 * oldest first, as core's schema reads them back; also those that don't
 * reconcile, which say so.
 */
export const listCardFigures = async (
  { tx, userId }: UserContext,
  {
    accountId,
    period,
  }: { readonly accountId: string; readonly period: Period },
): Promise<CardFigures[]> => {
  const rows = await tx
    .select({
      from: statements.periodFrom,
      to: statements.periodTo,
      isVerified: statements.balanceVerified,
      differenceMinor: statements.balanceDifferenceMinor,
      card: statements.card,
    })
    .from(statements)
    .where(
      and(
        eq(statements.userId, userId),
        eq(statements.accountId, accountId),
        isNotNull(statements.card),
        gte(statements.periodTo, period.from),
        lte(statements.periodTo, period.to),
      ),
    )
    .orderBy(asc(statements.periodTo));
  return rows.flatMap(({ from, to, card, ...row }) =>
    card === null
      ? []
      : [
          {
            period: { from, to },
            ...row,
            card: preparedCardSchema.parse(card),
          },
        ],
  );
};
