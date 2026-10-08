import { describe, expect, it } from "vitest";
import { APP_ERROR_CODE } from "./app-error.constants";

describe("APP_ERROR_CODE", () => {
  it("defines the seven domain error codes", () => {
    expect(Object.keys(APP_ERROR_CODE)).toEqual([
      "INVALID_INPUT",
      "UNKNOWN_FORMAT",
      "PARSE_FAILED",
      "BALANCE_MISMATCH",
      "LIMIT_REACHED",
      "NOT_FOUND",
      "UNAUTHORIZED",
    ]);
  });

  it("uses each key as its value, so codes can be matched by name", () => {
    for (const [key, value] of Object.entries(APP_ERROR_CODE)) {
      expect(value).toBe(key);
    }
  });
});
