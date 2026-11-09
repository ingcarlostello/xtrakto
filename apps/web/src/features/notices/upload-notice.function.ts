import { inngest, uploadsFinished } from "@/lib/inngest";
import { claimUploadNotice, sendUploadNotice } from "./notices.service";

/**
 * Emails a person once their upload's files ended (10.4a): each file that
 * ends sends the event, and the debounce leaves one run per upload, a minute
 * after the last. Its steps return ids, codes and counts only (ADR 0019): the
 * address stays inside `send`.
 */
export const notifyUploadsFinished = inngest.createFunction(
  {
    id: "notify-uploads-finished",
    triggers: [uploadsFinished],
    retries: 3,
    debounce: { key: "event.data.userId", period: "1m", timeout: "10m" },
  },
  async ({ event, step }) => {
    const { userId } = event.data;
    const notice = await step.run("claim", () => claimUploadNotice(userId));
    if (!notice) return { status: "nothing" } as const;
    return step.run("send", () => sendUploadNotice(userId, notice));
  },
);
