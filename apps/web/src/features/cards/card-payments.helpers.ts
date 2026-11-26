import type { CardPaymentPair } from "@xtrakto/db";
import { accountShortLabel } from "@/utils/account-label.helpers";
import { CARD_PAYMENTS_COPY as COPY } from "./card-payments.constants";

const lowerFirst = (text: string): string =>
  `${text.charAt(0).toLocaleLowerCase("es-CO")}${text.slice(1)}`;

/**
 * The other side of a payment to a card, in words (12.3e): `"Llegó a tu
 * tarjeta Nu ••••5678"` from the payment, `"Salió de tu cuenta de ahorros
 * ••••8901"` from the card.
 */
export const pairedText = ({ direction, account }: CardPaymentPair): string =>
  `${direction === "to" ? COPY.reached : COPY.cameFrom} ${lowerFirst(
    accountShortLabel(account, account.last4),
  )}`;
