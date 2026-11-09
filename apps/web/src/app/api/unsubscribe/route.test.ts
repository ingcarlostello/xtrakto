import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const mocks = vi.hoisted(() => ({ turnNoticeOff: vi.fn() }));
vi.mock("@/features/notices/notices.service", () => mocks);

const post = (query: string, body?: string) =>
  POST(
    new NextRequest(`https://xtrakto.site/api/unsubscribe${query}`, {
      method: "POST",
      body,
    }),
  );

beforeEach(() => {
  vi.resetAllMocks();
  mocks.turnNoticeOff.mockResolvedValue(undefined);
});

describe("POST /api/unsubscribe", () => {
  it("answers a mail provider's one-click with a 200", async () => {
    const response = await post("?token=abc", "List-Unsubscribe=One-Click");

    expect(mocks.turnNoticeOff).toHaveBeenCalledWith("abc");
    expect(response.status).toBe(200);
  });

  it("leads the page's button to what it did", async () => {
    const response = await post("?token=abc");

    expect(mocks.turnNoticeOff).toHaveBeenCalledWith("abc");
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      "https://xtrakto.site/unsubscribe/done",
    );
  });

  it("answers the same without a token", async () => {
    const response = await post("", "List-Unsubscribe=One-Click");

    expect(mocks.turnNoticeOff).toHaveBeenCalledWith("");
    expect(response.status).toBe(200);
  });
});
