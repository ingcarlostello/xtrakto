import { afterEach, describe, expect, it, vi } from "vitest";
import { todayInBogota } from "./recurring-calendar.service";

describe("todayInBogota", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("reads the day in Bogotá, which can still be the day before UTC's", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-21T03:00:00Z"));

    expect(todayInBogota()).toBe("2026-10-20");
  });
});
