import { describe, expect, expectTypeOf, it } from "vitest";
import { localDateSchema, periodSchema } from "./date.schemas";
import type { LocalDate } from "./date.types";

describe("localDateSchema", () => {
  it("accepts an existing date and types it as LocalDate", () => {
    expect(localDateSchema.safeParse("2024-02-29").success).toBe(true);
    expectTypeOf(
      localDateSchema.parse("2026-07-01"),
    ).toEqualTypeOf<LocalDate>();
  });

  it.each(["2026-02-29", "2026/07/01", "2026-07-01T05:00:00Z", 46_204])(
    "rejects %j",
    (value) => {
      expect(localDateSchema.safeParse(value).success).toBe(false);
    },
  );
});

describe("periodSchema", () => {
  it.each([
    { from: "2026-06-30", to: "2026-09-30" },
    { from: "2026-07-01", to: "2026-07-01" },
  ])("accepts $from to $to", (period) => {
    expect(periodSchema.safeParse(period).success).toBe(true);
  });

  it("rejects a period that ends before it starts, pointing at its end", () => {
    const result = periodSchema.safeParse({
      from: "2026-09-30",
      to: "2026-06-30",
    });

    expect(result.error?.issues.map(({ path }) => path)).toEqual([["to"]]);
  });

  it("rejects a period with an invalid date", () => {
    const period = { from: "2026-02-30", to: "2026-03-31" };

    expect(periodSchema.safeParse(period).success).toBe(false);
  });
});
