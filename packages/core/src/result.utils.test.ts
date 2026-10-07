import { describe, expect, expectTypeOf, it } from "vitest";
import { APP_ERROR_CODE } from "./app-error.constants";
import type { AppError } from "./app-error.types";
import type { Result } from "./result.types";
import { err, ok } from "./result.utils";

const parsePositive = (input: number): Result<number> =>
  input > 0
    ? ok(input)
    : err({ code: APP_ERROR_CODE.INVALID_INPUT, details: { field: "input" } });

describe("ok", () => {
  it("wraps a value in a successful result", () => {
    expect(ok(42)).toEqual({ ok: true, value: 42 });
  });
});

describe("err", () => {
  it("wraps an error in a failed result", () => {
    const error: AppError = { code: APP_ERROR_CODE.NOT_FOUND };

    expect(err(error)).toEqual({ ok: false, error });
  });
});

describe("Result", () => {
  it("narrows to the value when the result is ok", () => {
    const result = parsePositive(5);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expectTypeOf(result.value).toEqualTypeOf<number>();
      expect(result.value).toBe(5);
    }
  });

  it("narrows to an AppError with its details when the result fails", () => {
    const result = parsePositive(-1);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expectTypeOf(result.error).toEqualTypeOf<AppError>();
      expect(result.error).toEqual({
        code: APP_ERROR_CODE.INVALID_INPUT,
        details: { field: "input" },
      });
    }
  });

  it("uses AppError as the default error type", () => {
    expectTypeOf<Result<number>>().toEqualTypeOf<Result<number, AppError>>();
  });
});
