import { inngest } from "@/lib/inngest";

// Proves the setup: send `app/ping` from the Dev Server (http://127.0.0.1:8288)
// and the run returns { pong: true }. Phase 5.5b replaces it with the
// ingestion function.
export const ping = inngest.createFunction(
  { id: "ping", triggers: [{ event: "app/ping" }], retries: 0 },
  ({ step }) => step.run("pong", () => ({ pong: true })),
);
