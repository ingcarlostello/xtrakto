import type { ChargedInstallment, LocalDate } from "@xtrakto/core";
import type { CardPurchase } from "@xtrakto/db";

/**
 * What a card's latest statement that reconciles and charges a purchase
 * charged of it (12.3d), with the day that statement closed.
 */
export type LatestInstallment = ChargedInstallment & {
  readonly closedOn: LocalDate;
};

/** A purchase the card's latest statement still charges, and what's left of it. */
export type InstallmentLeft = {
  readonly purchase: CardPurchase;
  readonly installment: LatestInstallment;
};

/** What the card's latest statement that reconciles still charges. */
export type InstallmentsLeft = {
  readonly closedOn: LocalDate;
  readonly purchases: readonly InstallmentLeft[];
};

/** A card's installments: each purchase in installments' latest, by its movement's id, and what's left. */
export type CardInstallments = {
  readonly byMovement: ReadonlyMap<string, LatestInstallment>;
  /** `null` for any other account, or until a card's statement reconciles. */
  readonly left: InstallmentsLeft | null;
};
