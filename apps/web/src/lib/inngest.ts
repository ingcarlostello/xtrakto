import "server-only";
import { Inngest } from "inngest";

// The app's Inngest client. The SDK reads its mode and keys from the variables
// lib/env.ts validates: INNGEST_DEV locally, the signing and event keys when
// deployed. Checkpointing runs consecutive steps in one request for up to
// maxRuntime, kept under the route's maxDuration (app/api/inngest/route.ts).
export const inngest = new Inngest({
  id: "xtrakto",
  checkpointing: { maxRuntime: "40s" },
});
