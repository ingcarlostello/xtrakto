import { InngestTestEngine } from "@inngest/test";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { notifyUploadsFinished } from "./upload-notice.function";

const mocks = vi.hoisted(() => ({
  claimUploadNotice: vi.fn(),
  sendUploadNotice: vi.fn(),
}));
vi.mock("./notices.service", () => mocks);

const USER_ID = "0b6f1d2e-58c4-4c31-9a59-6a3f0f5c2e11";
const NOTICE = {
  jobId: "7d1e3c5a-2b4f-4e6a-8c9d-0e1f2a3b4c5d",
  files: 2,
  failed: 0,
  added: 7,
};

const run = () =>
  new InngestTestEngine({ function: notifyUploadsFinished }).execute({
    events: [{ name: "uploads/finished", data: { userId: USER_ID } }],
  });

beforeEach(() => {
  vi.resetAllMocks();
  mocks.claimUploadNotice.mockResolvedValue(NOTICE);
  mocks.sendUploadNotice.mockResolvedValue({ status: "sent" });
});

describe("notify-uploads-finished", () => {
  it("waits for the last file of the user's upload", () => {
    expect(notifyUploadsFinished.opts.debounce).toEqual({
      key: "event.data.userId",
      period: "1m",
      timeout: "10m",
    });
  });

  it("sends the notice it claimed, keeping only ids, counts and codes", async () => {
    const { result, state } = await run();

    expect(mocks.sendUploadNotice).toHaveBeenCalledWith(USER_ID, NOTICE);
    expect(result).toEqual({ status: "sent" });
    expect(await Promise.all(Object.values(state))).toEqual([
      NOTICE,
      { status: "sent" },
    ]);
  });

  it("sends nothing when there's nothing to say", async () => {
    mocks.claimUploadNotice.mockResolvedValue(null);

    const { result } = await run();

    expect(result).toEqual({ status: "nothing" });
    expect(mocks.sendUploadNotice).not.toHaveBeenCalled();
  });
});
