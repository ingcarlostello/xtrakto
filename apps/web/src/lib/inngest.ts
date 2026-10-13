import "server-only";
import { eventType, Inngest } from "inngest";
import { z } from "zod";

// The app's Inngest client. The SDK reads its mode and keys from the variables
// lib/env.ts validates: INNGEST_DEV locally, the signing and event keys when
// deployed. Checkpointing runs consecutive steps in one request for up to
// maxRuntime, kept under the route's maxDuration (app/api/inngest/route.ts).
export const inngest = new Inngest({
  id: "xtrakto",
  checkpointing: { maxRuntime: "40s" },
});

/**
 * A statement was submitted: its job waits with the content. Ids only, since
 * Inngest stores and shows event payloads; the user's id is there because
 * Row-Level Security hides the job from anyone else.
 */
export const statementSubmitted = eventType("statement/submitted", {
  schema: z.strictObject({ jobId: z.uuid(), userId: z.uuid() }),
});
