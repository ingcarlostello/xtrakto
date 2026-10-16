import { z } from "zod";
import { FIRST_FILE } from "./onboarding.constants";

/** The file chosen to upload first; the quarterly statement unless it's the other. */
export const firstFileSchema = z
  .enum([FIRST_FILE.QUARTERLY, FIRST_FILE.MOVEMENTS])
  .catch(FIRST_FILE.QUARTERLY);

export type FirstFile = z.infer<typeof firstFileSchema>;
