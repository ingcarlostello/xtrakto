import { InngestTestEngine } from "@inngest/test";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  queueMonthlySummaries,
  sendMonthlySummaryEmail,
} from "./monthly-summary.function";

const mocks = vi.hoisted(() => ({
  queueMonthlySummaryEmails: vi.fn(),
  sendMonthlySummary: vi.fn(),
}));
vi.mock("./monthly-summary.service", () => mocks);

const USER_ID = "0b6f1d2e-58c4-4c31-9a59-6a3f0f5c2e11";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.queueMonthlySummaryEmails.mockResolvedValue({ people: 3 });
  mocks.sendMonthlySummary.mockResolvedValue({ status: "sent" });
});

describe("queue-monthly-summaries", () => {
  it("runs on the first of each month, in Bogotá", () => {
    expect(queueMonthlySummaries.opts.triggers).toEqual([
      { cron: "TZ=America/Bogota 0 8 1 * *" },
    ]);
  });

  it("keeps only a count", async () => {
    const { result, state } = await new InngestTestEngine({
      function: queueMonthlySummaries,
    }).execute({
      events: [{ name: "inngest/scheduled.timer", data: {} }],
    });

    expect(result).toEqual({ people: 3 });
    expect(await Promise.all(Object.values(state))).toEqual([{ people: 3 }]);
  });
});

describe("send-monthly-summary", () => {
  const run = () =>
    new InngestTestEngine({ function: sendMonthlySummaryEmail }).execute({
      events: [
        {
          name: "monthly-summary/due",
          data: { userId: USER_ID, month: "2026-10" },
        },
      ],
    });

  it("sends one person's email, keeping only its code", async () => {
    const { result, state } = await run();

    expect(mocks.sendMonthlySummary).toHaveBeenCalledWith(USER_ID, "2026-10");
    expect(result).toEqual({ status: "sent" });
    expect(await Promise.all(Object.values(state))).toEqual([
      { status: "sent" },
    ]);
  });

  it("keeps a failure in its own run, sanitized", async () => {
    const sanitized = "MONTHLY_SUMMARY_NOT_SENT: Error";
    mocks.sendMonthlySummary.mockRejectedValue(new Error(sanitized));

    const { error } = await run();

    expect(error).toMatchObject({ message: sanitized });
    expect(error).not.toHaveProperty("cause");
  });

  it("goes one at a time, under the providers' limits", () => {
    expect(sendMonthlySummaryEmail.opts.concurrency).toEqual({ limit: 1 });
  });
});
