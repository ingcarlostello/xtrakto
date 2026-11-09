import { DEFAULT_TIME_ZONE } from "@xtrakto/core";
import { cron } from "inngest";
import { inngest, monthlySummaryDue } from "@/lib/inngest";
import {
  queueMonthlySummaryEmails,
  sendMonthlySummary,
} from "./monthly-summary.service";

/**
 * On the first of each month at 08:00 in Bogotá, queues the monthly email of
 * everyone who asked for it (10.5). Its step returns a count only.
 */
export const queueMonthlySummaries = inngest.createFunction(
  {
    id: "queue-monthly-summaries",
    triggers: [cron(`TZ=${DEFAULT_TIME_ZONE} 0 8 1 * *`)],
    retries: 3,
  },
  ({ step }) => step.run("queue", queueMonthlySummaryEmails),
);

/**
 * One person's monthly email, in a run of its own, so a failure stops no one
 * else. One at a time: well under Clerk's and Resend's rate limits. Its step
 * returns a code only, and the address stays inside it.
 */
export const sendMonthlySummaryEmail = inngest.createFunction(
  {
    id: "send-monthly-summary",
    triggers: [monthlySummaryDue],
    retries: 3,
    concurrency: { limit: 1 },
  },
  ({ event, step }) =>
    step.run("send", () =>
      sendMonthlySummary(event.data.userId, event.data.month),
    ),
);
