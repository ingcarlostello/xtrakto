import { APP_ERROR_CODE, PERIOD_SOURCE, periodSchema } from "@xtrakto/core";
import type { AppError } from "@xtrakto/core";
import { describe, expect, it } from "vitest";
import { countText, previewTags, problemText } from "./upload-display.helpers";
import { PROBLEM_COPY, UPLOAD_COPY } from "./upload.constants";

describe("previewTags", () => {
  it("names a quarterly statement's bank, format, file type and months", () => {
    expect(
      previewTags({
        bankId: "bancolombia",
        formatId: "bancolombia-savings-quarterly",
        period: periodSchema.parse({ from: "2026-06-30", to: "2026-09-30" }),
        periodSource: PERIOD_SOURCE.STATEMENT,
        movementCount: 33,
      }),
    ).toEqual(["Bancolombia", "Extracto trimestral", "Excel", "jul–sep 2026"]);
  });

  it("names a movements export by the days of its movements", () => {
    expect(
      previewTags({
        bankId: "bancolombia",
        formatId: "bancolombia-movements-export",
        period: periodSchema.parse({ from: "2026-08-01", to: "2026-08-15" }),
        periodSource: PERIOD_SOURCE.ROWS,
        movementCount: 48,
      }),
    ).toEqual(["Bancolombia", "Movimientos", "Excel", "1–15 ago 2026"]);
  });
});

describe("countText", () => {
  it.each([
    [0, "0 movimientos"],
    [1, "1 movimiento"],
    [33, "33 movimientos"],
    [1234, "1.234 movimientos"],
  ])("writes %i as %s", (count, expected) => {
    expect(countText(count, UPLOAD_COPY.movements)).toBe(expected);
  });
});

describe("problemText", () => {
  const problem = (code: AppError["code"], reason?: string): AppError =>
    reason ? { code, details: { reason } } : { code };

  it.each([
    [
      "a file that isn't a spreadsheet",
      problem(APP_ERROR_CODE.UNKNOWN_FORMAT, "file_type"),
      PROBLEM_COPY.notExcel,
    ],
    [
      "a spreadsheet no parser knows",
      problem(APP_ERROR_CODE.UNKNOWN_FORMAT),
      PROBLEM_COPY.notAStatement,
    ],
    [
      "a file over 10 MB",
      problem(APP_ERROR_CODE.INVALID_INPUT, "file_size"),
      PROBLEM_COPY.tooHeavy,
    ],
    [
      "a file chosen twice",
      problem(APP_ERROR_CODE.INVALID_INPUT, "duplicate"),
      PROBLEM_COPY.duplicate,
    ],
    [
      "content over the bounds",
      problem(APP_ERROR_CODE.INVALID_INPUT, "too_large"),
      PROBLEM_COPY.tooLarge,
    ],
    [
      "a file SheetJS can't open",
      problem(APP_ERROR_CODE.PARSE_FAILED),
      PROBLEM_COPY.damaged,
    ],
    [
      "a file the browser can't read",
      problem(APP_ERROR_CODE.PARSE_FAILED, "unreadable"),
      PROBLEM_COPY.unreadable,
    ],
    [
      "a statement with a part missing",
      problem(APP_ERROR_CODE.PARSE_FAILED, "missing_column"),
      PROBLEM_COPY.incomplete,
    ],
    [
      "any other error",
      problem(APP_ERROR_CODE.NOT_FOUND),
      PROBLEM_COPY.unreadable,
    ],
  ])("explains %s", (_case, error, expected) => {
    expect(problemText(error)).toEqual(expected);
  });
});
