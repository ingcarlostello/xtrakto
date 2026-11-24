import { z } from "zod";
import { localDateSchema } from "../dates/date.schemas";
import { amountMinorSchema } from "../money/money.schemas";
import {
  CARD_SUMMARY_KIND,
  MAX_INSTALLMENTS,
  MAX_RATE_PPM,
} from "./card.constants";

// What a card statement prints beside its movements (12.2a). Its summaries
// keep each line as a positive amount, whatever sign the bank prints.

const installmentCountSchema = z.int().min(1).max(MAX_INSTALLMENTS);

/** A purchase's installment, as its card's statement prints it. */
export const installmentSchema = z
  .strictObject({
    /** "3 de 24" is the 3rd of 24. */
    number: installmentCountSchema,
    count: installmentCountSchema,
    /** This month's installment. */
    monthlyMinor: amountMinorSchema.optional(),
    /** The purchase's monthly rate, in parts per million: 1.9% is 19,000. */
    monthlyRatePpm: z.int().nonnegative().max(MAX_RATE_PPM).optional(),
    /** What remains to pay after this month's installment. */
    remainingMinor: amountMinorSchema.optional(),
  })
  .refine(({ number, count }) => number <= count, {
    message: "An installment within its count",
  });

// Bancolombia's "Resumen saldo total": the debt, from the previous balance,
// the month's charges and its payments.
const bancolombiaTotalSchema = z.strictObject({
  previousBalanceMinor: amountMinorSchema,
  purchasesMinor: amountMinorSchema,
  lateInterestMinor: amountMinorSchema,
  interestMinor: amountMinorSchema,
  advancesMinor: amountMinorSchema,
  otherChargesMinor: amountMinorSchema,
  /** The previous balance and the charges, as the bank adds them up. */
  chargesMinor: amountMinorSchema,
  paymentsMinor: amountMinorSchema,
  creditInFavorMinor: amountMinorSchema,
});

// Bancolombia's "Resumen pago mínimo": what the minimum is made of.
const bancolombiaMinimumSchema = z.strictObject({
  installmentsMinor: amountMinorSchema,
  earlierInstallmentsMinor: amountMinorSchema,
  advanceInstallmentsMinor: amountMinorSchema,
  lateInterestMinor: amountMinorSchema,
  interestMinor: amountMinorSchema,
  otherChargesMinor: amountMinorSchema,
  overdueMinor: amountMinorSchema,
  inFavorMinor: amountMinorSchema,
});

const bancolombiaSummarySchema = z.strictObject({
  kind: z.literal(CARD_SUMMARY_KIND.BANCOLOMBIA),
  total: bancolombiaTotalSchema,
  minimum: bancolombiaMinimumSchema,
});

// Nu's "Resumen de tu extracto".
const nuSummarySchema = z.strictObject({
  kind: z.literal(CARD_SUMMARY_KIND.NU),
  /** The installments due this month, late interest included. */
  dueThisMonthMinor: amountMinorSchema,
  /** Printed only when charged. */
  lateInterestMinor: amountMinorSchema.optional(),
  interestMinor: amountMinorSchema,
  advanceFeesMinor: amountMinorSchema,
  serviceFeesMinor: amountMinorSchema,
  conversionChargesMinor: amountMinorSchema,
  paymentsToMinimumMinor: amountMinorSchema,
  refundsMinor: amountMinorSchema,
  paymentsToTotalMinor: amountMinorSchema,
  /** What the installments leave after this month's, before payments to the total. */
  remainingDebtMinor: amountMinorSchema,
});

/** A card statement's figures: its limit, what's due and by when, and its summary. */
export const cardStatementSchema = z.strictObject({
  creditLimitMinor: amountMinorSchema,
  availableMinor: amountMinorSchema,
  minimumPaymentMinor: amountMinorSchema,
  /** What clears the card. */
  totalPaymentMinor: amountMinorSchema,
  /** None when nothing is due. */
  dueDate: localDateSchema.optional(),
  /** When the bank prints it apart from the period's last day. */
  cutDate: localDateSchema.optional(),
  summary: z.discriminatedUnion("kind", [
    bancolombiaSummarySchema,
    nuSummarySchema,
  ]),
});
