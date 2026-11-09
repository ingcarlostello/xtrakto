import type { AmountMinor, LocalDate } from "@xtrakto/core";

/** What today's balance came to (10.3): it adds up, or by how much it's off. */
export type TodaysBalanceAnswer =
  | {
      readonly status: "adds_up";
      readonly date: LocalDate;
      readonly amountMinor: AmountMinor;
    }
  | { readonly status: "off"; readonly differenceMinor: AmountMinor };

/** The field a movements file's result offers, with its answer once typed today. */
export type TodaysBalanceOffer = {
  readonly accountId: string;
  readonly answer?: TodaysBalanceAnswer;
};
