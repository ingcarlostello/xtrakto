import { z } from "zod";
import { joinWaitlistSchema } from "./waitlist.schemas";
import type {
  WaitlistField,
  WaitlistFieldErrors,
  WaitlistFormValues,
} from "./waitlist.types";

/** The fields in the form's order: the focus goes to the first wrong one. */
export const WAITLIST_FIELDS = [
  "name",
  "email",
  "consent",
] as const satisfies readonly WaitlistField[];

/** The form's values; an unchecked box sends nothing. */
export const readWaitlistForm = (data: FormData): WaitlistFormValues => ({
  name: String(data.get("name") ?? ""),
  email: String(data.get("email") ?? ""),
  consent: data.has("consent"),
});

/** Each field's first problem, by the action's own schema; none when valid. */
export const waitlistFormErrors = (
  values: WaitlistFormValues,
): WaitlistFieldErrors => {
  const result = joinWaitlistSchema.safeParse(values);
  if (result.success) return {};
  const { fieldErrors } = z.flattenError(result.error);
  return Object.fromEntries(
    WAITLIST_FIELDS.flatMap((field) => {
      const message = fieldErrors[field]?.[0];
      return message ? [[field, message]] : [];
    }),
  );
};
