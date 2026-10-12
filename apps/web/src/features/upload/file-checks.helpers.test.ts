import { APP_ERROR_CODE } from "@xtrakto/core";
import { describe, expect, it } from "vitest";
import { fileProblem } from "./file-checks.helpers";
import { FILE_PROBLEM, MAX_FILE_SIZE_BYTES } from "./upload.constants";

// Only the name, size and date of a file are checked, so its bytes stay empty.
const fileOf = (name: string, size = 12_000, lastModified = 1) => {
  const file = new File([], name, { lastModified });
  Object.defineProperty(file, "size", { value: size });
  return file;
};

describe("fileProblem", () => {
  it.each(["extracto.xlsx", "EXTRACTO.XLSX"])("accepts %s", (name) => {
    expect(fileProblem(fileOf(name), [])).toBeUndefined();
  });

  it.each(["extracto.pdf", "movimientos.csv", "extracto.xls", "extracto"])(
    "refuses %s, which isn't an XLSX file",
    (name) => {
      expect(fileProblem(fileOf(name), [])).toEqual({
        code: APP_ERROR_CODE.UNKNOWN_FORMAT,
        details: { reason: FILE_PROBLEM.TYPE },
      });
    },
  );

  it("accepts a file of exactly 10 MB and refuses a larger one", () => {
    expect(
      fileProblem(fileOf("a.xlsx", MAX_FILE_SIZE_BYTES), []),
    ).toBeUndefined();
    expect(fileProblem(fileOf("a.xlsx", MAX_FILE_SIZE_BYTES + 1), [])).toEqual({
      code: APP_ERROR_CODE.INVALID_INPUT,
      details: { reason: FILE_PROBLEM.SIZE },
    });
  });

  it("refuses a file already chosen, but not another file with its name", () => {
    const chosen = [fileOf("extracto.xlsx")];

    expect(fileProblem(fileOf("extracto.xlsx"), chosen)).toEqual({
      code: APP_ERROR_CODE.INVALID_INPUT,
      details: { reason: FILE_PROBLEM.DUPLICATE },
    });
    expect(
      fileProblem(fileOf("extracto.xlsx", 13_000), chosen),
    ).toBeUndefined();
    expect(
      fileProblem(fileOf("extracto.xlsx", 12_000, 2), chosen),
    ).toBeUndefined();
  });
});
