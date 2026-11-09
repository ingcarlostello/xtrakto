import { z } from "zod";

/** The notices a person can turn on and off. */
export const noticeIdSchema = z.enum([
  "uploadReady",
  "reviewWaiting",
  "fixedPaymentRose",
  "monthlySummary",
]);

/** What the profile's switch sends. */
export const setNoticeSchema = z.strictObject({
  notice: noticeIdSchema,
  isOn: z.boolean(),
});
