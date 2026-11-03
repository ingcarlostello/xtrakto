import { CHANNELS } from "../categorization/channel.constants";
import {
  HOME_SERVICES,
  type HomeService,
} from "../categorization/movement-title.constants";
import { homeServiceOf } from "../categorization/movement-title.helpers";
import { PAYMENT_TITLES } from "./recurring.constants";
import type { RecurringPayment } from "./recurring.types";

const DOTS = "•••";

/**
 * Who some money went to, as the bank wrote it: who was paid, or the number
 * paid by its channel ("Nequi ••• 1270").
 */
export const payeeTitle = ({
  label,
  referenceLast4,
  channels,
}: Pick<RecurringPayment, "label" | "referenceLast4" | "channels">): string => {
  if (referenceLast4 === null) return label;
  const channel = CHANNELS.find(({ id }) => id === channels[0]);
  return `${channel?.labelEs ?? label} ${DOTS} ${referenceLast4}`;
};

/** The home service a payment pays, as its latest text's words name it (8.6d). */
export const recurringPaymentService = ({
  bankTexts,
  categoryId,
}: Pick<RecurringPayment, "bankTexts" | "categoryId">):
  HomeService | undefined => {
  const [latest] = bankTexts;
  return latest === undefined
    ? undefined
    : homeServiceOf({ description: latest, categoryId });
};

// What a payment pays for in plain words, when something says it: the home
// service its words name, the LLM's title of a payment no rule names
// (8.6b), or what its category pays for. A number paid names who instead.
const paidForOf = (payment: RecurringPayment): string | undefined => {
  if (payment.referenceLast4 !== null) return undefined;
  const service = recurringPaymentService(payment);
  if (service !== undefined) return HOME_SERVICES[service];
  return payment.llmTitle ?? PAYMENT_TITLES[payment.categoryId];
};

/**
 * A payment that repeats, as its title reads (8.6d, docs/ui/v8-04): what it
 * pays for in plain words ("Energía", "Cuotas de tu crédito"), else who was
 * paid as the bank wrote it ("GIMNASIO FIT", "Nequi ••• 1270").
 */
export const recurringPaymentTitle = (payment: RecurringPayment): string =>
  paidForOf(payment) ?? payeeTitle(payment);

/**
 * The same, as running text writes it after other words ("Pendiente:
 * gas"): who was paid stays as the bank wrote it.
 */
export const recurringPaymentInText = (payment: RecurringPayment): string => {
  const paidFor = paidForOf(payment);
  return paidFor === undefined
    ? payeeTitle(payment)
    : `${paidFor.charAt(0).toLowerCase()}${paidFor.slice(1)}`;
};
