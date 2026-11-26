import "server-only";
import {
  type AccountRow,
  listCardFigures,
  listCardPurchases,
  type UserContext,
} from "@xtrakto/db";
import { isCard } from "@/utils/account-label.helpers";
import {
  installmentsLeft,
  latestInstallments,
} from "./card-installments.helpers";
import type { CardInstallments } from "./card-installments.types";

const NONE: CardInstallments = { byMovement: new Map(), left: null };

/**
 * A card's installments (12.3d): what its latest statement that reconciles
 * and charges each purchase in installments charged of it, by the
 * purchase's movement, and what its latest statement still charges. A
 * purchase paid in one ("1 de 1") isn't in installments. None for any
 * other account.
 */
export const readCardInstallments = async (
  ctx: UserContext,
  account: AccountRow,
): Promise<CardInstallments> => {
  if (!isCard(account)) return NONE;
  const statements = await listCardFigures(ctx, { accountId: account.id });
  const latest = latestInstallments(statements);
  const purchases = await listCardPurchases(ctx, {
    accountId: account.id,
    fingerprints: [...latest.keys()],
  });
  return {
    byMovement: new Map(
      purchases.flatMap(({ id, fingerprint }) => {
        const installment = latest.get(fingerprint);
        return installment && installment.count > 1
          ? [[id, installment] as const]
          : [];
      }),
    ),
    left: installmentsLeft(statements, purchases),
  };
};
