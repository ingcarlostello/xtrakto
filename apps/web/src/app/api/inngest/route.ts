import { serve } from "inngest/next";
import { ingestStatement } from "@/features/ingestion/ingest-statement.function";
import { cleanUpStaleJobs } from "@/features/ingestion/stale-jobs.function";
import { inngest } from "@/lib/inngest";

// Inngest syncs the app's functions (PUT) and runs them (POST) through this
// route; GET describes them. It is public in the proxy (lib/auth-routes.ts):
// in Cloud mode the SDK checks Inngest's signature on every request.
// Seconds; keep it above the client's checkpointing maxRuntime (lib/inngest.ts).
export const maxDuration = 60;

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [ingestStatement, cleanUpStaleJobs],
});
