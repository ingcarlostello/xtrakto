import { z } from "zod";
import { CURRENCY } from "./money.constants";
import { isAmountMinor } from "./money.helpers";
import type { AmountMinor } from "./money.types";

export const amountMinorSchema = z.custom<AmountMinor>(isAmountMinor, {
  message: "Expected a safe integer number of minor units",
});

export const currencySchema = z.enum(CURRENCY);
