import { MAX_LLM_ROUNDS } from "@/features/llm-categories/llm-categories.constants";
import { categorizeWaitingMovements } from "@/features/llm-categories/llm-categories.service";
import { inngest, statementSubmitted } from "@/lib/inngest";
import { claimJob, failJob, ingestJob } from "./ingest-statement.service";

/**
 * Ingests a submitted statement (ADR 0019): `claim` marks its job as
 * processing, and `ingest` does the rest in one transaction. Once the job is
 * done, rounds of one batch each give the LLM's categories to what no rule
 * names (8.5b), never failing the job. Steps return ids, codes and counts
 * only, and their errors are sanitized, since Inngest stores and shows step
 * outputs, results and errors. After the last retry, the job fails, if still
 * open, and its content is deleted.
 */
export const ingestStatement = inngest.createFunction(
  {
    id: "ingest-statement",
    triggers: [statementSubmitted],
    retries: 3,
    // A user's statements one at a time, so each one's coverage sees the
    // ones saved before it; the job's lock keeps it so whatever the queue does.
    concurrency: { key: "event.data.userId", limit: 1 },
    // A round's two attempts take up to 40 seconds (lib/ai.ts), so it starts
    // only while a request is young enough to end within the route's 60.
    checkpointing: { maxRuntime: "15s" },
    onFailure: ({ event, step }) =>
      step.run("fail", () => failJob(event.data.event.data)),
  },
  async ({ event, step }) => {
    const isClaimed = await step.run("claim", () => claimJob(event.data));
    if (!isClaimed) return { status: "closed" } as const;
    const outcome = await step.run("ingest", () => ingestJob(event.data));
    if (outcome.status !== "done") return outcome;
    for (let round = 0; round < MAX_LLM_ROUNDS; round++) {
      const categorized = await step.run(`categorize-${round}`, () =>
        categorizeWaitingMovements(event.data.userId),
      );
      if (!categorized.hasMore) break;
    }
    return outcome;
  },
);
