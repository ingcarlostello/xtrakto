import { compareLocalDates, daysBetween } from "../dates/date.helpers";
import type { LocalDate } from "../dates/date.types";
import type { AmountMinor } from "../money/money.types";

/** A side of a payment to a card (12.3e): its movement, its day and its amount. */
export type CardPaymentSide = {
  readonly id: string;
  readonly date: LocalDate;
  readonly amountMinor: AmountMinor;
};

/** A savings account's payment to a card, and the card's movement that received it. */
export type CardPaymentLink = {
  readonly paymentId: string;
  readonly receivedId: string;
};

// The days between two sides, either way.
const apart = (a: CardPaymentSide, b: CardPaymentSide): number =>
  Math.abs(daysBetween(a.date, b.date));

/**
 * Pairs each payment to a card with the card's movement that received it
 * (12.3e): the same amount, the payment going out of the savings account
 * and coming in to the card, the same day or one apart. The oldest payment
 * pairs first, with the closest day, and among equals the first received:
 * each side pairs once.
 */
export const pairCardPayments = (
  payments: readonly CardPaymentSide[],
  received: readonly CardPaymentSide[],
): CardPaymentLink[] => {
  const unpaired = [...received];
  return [...payments]
    .sort((a, b) => compareLocalDates(a.date, b.date))
    .flatMap((payment) => {
      const [best] = unpaired
        .filter(
          (side) =>
            side.amountMinor === -payment.amountMinor &&
            apart(payment, side) <= 1,
        )
        .sort((a, b) => apart(payment, a) - apart(payment, b));
      if (best === undefined) return [];
      unpaired.splice(unpaired.indexOf(best), 1);
      return [{ paymentId: payment.id, receivedId: best.id }];
    });
};
