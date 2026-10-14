import { DEFAULT_TIME_ZONE } from "@xtrakto/core";
import { cron } from "inngest";
import { inngest } from "@/lib/inngest";
import { expireStaleJobs } from "./stale-jobs.service";

/**
 * Every day at 03:00 in Bogotá, expires the ingestion jobs that never
 * finished, such as those whose event was lost or whose run kept failing
 * without reaching its failure handler. Its step returns a count only.
 */
export const cleanUpStaleJobs = inngest.createFunction(
  {
    id: "clean-up-stale-jobs",
    triggers: [cron(`TZ=${DEFAULT_TIME_ZONE} 0 3 * * *`)],
    retries: 3,
  },
  ({ step }) => step.run("expire", expireStaleJobs),
);
