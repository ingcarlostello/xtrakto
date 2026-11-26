import { z } from "zod";
import { FIRST_BANK, FIRST_FILE } from "./onboarding.constants";

/** The file chosen to upload first; the quarterly statement unless another. */
export const firstFileSchema = z
  .enum([FIRST_FILE.QUARTERLY, FIRST_FILE.MOVEMENTS, FIRST_FILE.CARD])
  .catch(FIRST_FILE.QUARTERLY);

export type FirstFile = z.infer<typeof firstFileSchema>;

/** Whose files the person brings; Bancolombia's unless another bank's. */
export const firstBankSchema = z
  .enum([FIRST_BANK.BANCOLOMBIA, FIRST_BANK.NU, FIRST_BANK.OTHER])
  .catch(FIRST_BANK.BANCOLOMBIA);

export type FirstBank = z.infer<typeof firstBankSchema>;
