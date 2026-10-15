import { extractedContentSchema } from "@xtrakto/core";
import { z } from "zod";
import { ACCOUNT_KEY_PREFIX, MAX_TRACKED_JOBS } from "./upload.constants";

const { ACCOUNT, LAST4 } = ACCOUNT_KEY_PREFIX;

// The key the account selector gave a movements export
// (account-destination.helpers.ts), as the account it pins the job to.
const accountChoiceSchema = z.union([
  z
    .templateLiteral([ACCOUNT, z.uuid()])
    .transform((key) => ({ accountId: key.slice(ACCOUNT.length) })),
  z
    .templateLiteral([LAST4, z.string().regex(/^\d{4}$/)])
    .transform((key) => ({ accountLast4: key.slice(LAST4.length) })),
]);

/** What the upload screen sends for each file: never the file or its name. */
export const submitStatementSchema = z.strictObject({
  content: extractedContentSchema,
  account: accountChoiceSchema.optional(),
});

/** The jobs the upload screen asks about: its own, at most the month's. */
export const jobIdsSchema = z.array(z.uuid()).min(1).max(MAX_TRACKED_JOBS);
