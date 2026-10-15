import type { z } from "zod";
import type { joinWaitlistSchema } from "./waitlist.schemas";

/** What the form holds; the action checks it, so the box may be unchecked. */
export type WaitlistFormValues = {
  name: string;
  email: string;
  consent: boolean;
};

/** A valid entry: the name trimmed and the email lowercased. */
export type WaitlistEntryValues = z.output<typeof joinWaitlistSchema>;

export type WaitlistField = keyof WaitlistFormValues;

/** Each field's first problem, in the form's words. */
export type WaitlistFieldErrors = Partial<Record<WaitlistField, string>>;
