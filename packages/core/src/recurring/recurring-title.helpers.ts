import { CHANNELS } from "../categorization/channel.constants";
import type { RecurringPayment } from "./recurring.types";

const DOTS = "•••";

/**
 * Who a payment repeats to, or where some money went: who was paid, or the
 * number paid by its channel ("Nequi ••• 1270").
 */
export const recurringPaymentTitle = ({
  label,
  referenceLast4,
  channels,
}: Pick<RecurringPayment, "label" | "referenceLast4" | "channels">): string => {
  if (referenceLast4 === null) return label;
  const channel = CHANNELS.find(({ id }) => id === channels[0]);
  return `${channel?.labelEs ?? label} ${DOTS} ${referenceLast4}`;
};
