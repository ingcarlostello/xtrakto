import { beforeEach, describe, expect, it, vi } from "vitest";
import { exploreExample } from "./explore-example.action";

const mocks = vi.hoisted(() => ({
  steps: [] as string[],
  getSignedInClerkUserId: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getSignedInClerkUserId: mocks.getSignedInClerkUserId,
}));
vi.mock("@/lib/example-mode", () => ({
  startExample: async () => mocks.steps.push("started"),
}));
vi.mock("../example.service", () => ({
  ensureExampleData: async () => mocks.steps.push("saved"),
}));
// As Next.js does, a redirect ends the action.
vi.mock("next/navigation", () => ({
  redirect: (to: string) => {
    mocks.steps.push(`to ${to}`);
    throw new Error("NEXT_REDIRECT");
  },
}));

beforeEach(() => {
  vi.resetAllMocks();
  mocks.steps.length = 0;
  mocks.getSignedInClerkUserId.mockResolvedValue("user_clerk");
});

describe("exploreExample", () => {
  it("refuses a signed-out visitor, without opening anything", async () => {
    mocks.getSignedInClerkUserId.mockResolvedValue(null);

    await expect(exploreExample()).resolves.toEqual({
      ok: false,
      error: { code: "UNAUTHORIZED" },
    });
    expect(mocks.steps).toEqual([]);
  });

  it("saves the example's data, then shows it from the summary", async () => {
    await expect(exploreExample()).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.steps).toEqual(["saved", "started", "to /"]);
  });
});
