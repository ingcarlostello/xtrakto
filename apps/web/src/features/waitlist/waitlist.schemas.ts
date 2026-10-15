import { z } from "zod";
import {
  MAX_EMAIL_LENGTH,
  MAX_NAME_LENGTH,
  WAITLIST_COPY,
} from "./waitlist.constants";

const { errors, form } = WAITLIST_COPY;

/**
 * What the waitlist form sends: a name, an email and a consent that must be
 * `true`. Strict, so a consent time or version can't come from the browser.
 * The email is trimmed and lowercased before it's checked, as the database
 * keeps it; its messages are the form's, so the browser shows the same rules.
 */
export const joinWaitlistSchema = z.strictObject({
  name: z
    .string()
    .trim()
    .min(1, { error: errors.name })
    .max(MAX_NAME_LENGTH, { error: errors.nameTooLong }),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(
      z
        .email({ error: errors.email })
        .max(MAX_EMAIL_LENGTH, { error: errors.email }),
    ),
  consent: z.literal(true, { error: form.consentFirst }),
});
