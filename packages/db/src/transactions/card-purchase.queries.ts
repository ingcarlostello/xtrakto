import { and, eq, inArray } from "drizzle-orm";
import type { UserContext } from "../user-context/user-context.types";
import {
  LIST_ITEM_COLUMNS,
  type TransactionListItem,
} from "./transaction.queries";
import { transactions } from "./transaction.schemas";

/** A card's purchase, as a list shows it, with its fingerprint (12.3d). */
export type CardPurchase = TransactionListItem & {
  /** What a card's statement keeps its installments by (12.3a). */
  readonly fingerprint: string;
};

/**
 * The account's movements with these fingerprints: the purchases whose
 * installments its card's statements charge, each by the fingerprint they
 * keep it under (ADR 0040). None without fingerprints.
 */
export const listCardPurchases = async (
  { tx, userId }: UserContext,
  {
    accountId,
    fingerprints,
  }: { readonly accountId: string; readonly fingerprints: readonly string[] },
): Promise<CardPurchase[]> => {
  if (fingerprints.length === 0) return [];
  return tx
    .select({ ...LIST_ITEM_COLUMNS, fingerprint: transactions.fingerprint })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.accountId, accountId),
        inArray(transactions.fingerprint, [...fingerprints]),
      ),
    );
};
