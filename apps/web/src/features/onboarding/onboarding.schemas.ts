import { z } from "zod";
import { FIRST_BANK, FIRST_FILE } from "./onboarding.constants";

/** The file chosen to upload first; the quarterly statement unless it's the other. */
export const firstFileSchema = z
  .enum([FIRST_FILE.QUARTERLY, FIRST_FILE.MOVEMENTS])
  .catch(FIRST_FILE.QUARTERLY);

export type FirstFile = z.infer<typeof firstFileSchema>;

/** Whose files the person brings; Bancolombia's unless it's another bank. */
export const firstBankSchema = z
  .enum([FIRST_BANK.BANCOLOMBIA, FIRST_BANK.OTHER])
  .catch(FIRST_BANK.BANCOLOMBIA);

export type FirstBank = z.infer<typeof firstBankSchema>;
