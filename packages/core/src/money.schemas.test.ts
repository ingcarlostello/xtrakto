import { describe, expect, expectTypeOf, it } from "vitest";
import { amountMinorSchema, currencySchema } from "./money.schemas";
import type { AmountMinor } from "./money.types";

describe("amountMinorSchema", () => {
  it("accepts a safe integer and types it as AmountMinor", () => {
    const result = amountMinorSchema.safeParse(-1_500_000);

    expect(result.success && result.data).toBe(-1_500_000);
    expectTypeOf(amountMinorSchema.parse(0)).toEqualTypeOf<AmountMinor>();
  });

  it.each([12.34, "1,234.56", null, Number.NaN, 2 ** 53])(
    "rejects %j",
    (value) => {
      expect(amountMinorSchema.safeParse(value).success).toBe(false);
    },
  );
});

describe("currencySchema", () => {
  it("accepts COP", () => {
    expect(currencySchema.safeParse("COP").success).toBe(true);
  });

  it.each(["USD", "cop", ""])("rejects %j", (value) => {
    expect(currencySchema.safeParse(value).success).toBe(false);
  });
});
