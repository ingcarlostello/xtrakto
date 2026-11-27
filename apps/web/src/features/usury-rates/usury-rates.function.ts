import { captureMessage } from "@sentry/nextjs";
import { DEFAULT_TIME_ZONE } from "@xtrakto/core";
import { cron } from "inngest";
import { inngest } from "@/lib/inngest";
import { refreshUsuryRates } from "./usury-rates.service";

/**
 * Every day at 06:00 in Bogotá, adds the usury rates the Superintendencia
 * Financiera's history has and the table doesn't (12.4a): the whole
 * history on its first run, each month's once it's certified, before the
 * month starts. When the history can't be read after its retries, Sentry
 * tells the owner. Its step returns counts only.
 */
export const refreshUsuryRatesDaily = inngest.createFunction(
  {
    id: "refresh-usury-rates",
    triggers: [cron(`TZ=${DEFAULT_TIME_ZONE} 0 6 * * *`)],
    retries: 3,
    onFailure: () => {
      captureMessage(
        "The Superintendencia Financiera's usury history couldn't be read",
        "error",
      );
    },
  },
  ({ step }) => step.run("refresh", () => refreshUsuryRates()),
);
