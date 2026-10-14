import { inngest, statementSubmitted } from "@/lib/inngest";
import { claimJob, failJob, ingestJob } from "./ingest-statement.service";

/**
 * Ingests a submitted statement in two steps (ADR 0019): `claim` marks its
 * job as processing, and `ingest` does the rest in one transaction. Steps
 * return ids, codes and counts only, and their errors are sanitized, since
 * Inngest stores and shows step outputs, results and errors. After the last
 * retry, the job fails and its content is deleted.
 */
export const ingestStatement = inngest.createFunction(
  {
    id: "ingest-statement",
    triggers: [statementSubmitted],
    retries: 3,
    // A user's statements one at a time, so each one's coverage sees the
    // ones saved before it; the job's lock keeps it so whatever the queue does.
    concurrency: { key: "event.data.userId", limit: 1 },
    onFailure: ({ event, step }) =>
      step.run("fail", () => failJob(event.data.event.data)),
  },
  async ({ event, step }) => {
    const isClaimed = await step.run("claim", () => claimJob(event.data));
    if (!isClaimed) return { status: "closed" } as const;
    return step.run("ingest", () => ingestJob(event.data));
  },
);
