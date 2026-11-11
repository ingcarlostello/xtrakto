import { APP_ERROR_CODE, COLUMN_ROLE, err, ROLES_PROBLEM } from "@xtrakto/core";
import type { AppErrorDetails } from "@xtrakto/core";
import type { MappingReview } from "@xtrakto/parsers";
import { describe, expect, it } from "vitest";
import { readingProblem } from "./reading-problem.helpers";

const { DATE, DESCRIPTION, MONEY_OUT, MONEY_IN, NONE } = COLUMN_ROLE;

const REVIEW: MappingReview = {
  header: ["Fecha Trans", "Detalle", "Oficina", "Débitos", "Créditos"],
  names: ["FECHA TRANS", "DETALLE", "OFICINA", "DEBITOS", "CREDITOS"],
  rows: [],
  moreRows: 0,
  firstRow: 8,
  lastRow: 18,
  roles: [DATE, DESCRIPTION, NONE, MONEY_OUT, MONEY_IN],
  dateOrder: "dmy",
  decimalSeparator: ",",
  reading: err({ code: APP_ERROR_CODE.PARSE_FAILED }),
};

const failed = (details: AppErrorDetails) => ({
  code: APP_ERROR_CODE.PARSE_FAILED,
  details,
});

describe("readingProblem", () => {
  it.each([
    [ROLES_PROBLEM.DATE, "Elige qué columna tiene la fecha."],
    [ROLES_PROBLEM.DESCRIPTION, "Elige qué columna tiene la descripción."],
    [
      ROLES_PROBLEM.MONEY,
      "Elige cómo viene el dinero: un monto con signo, una salida y una entrada, o un monto y si entra o sale.",
    ],
  ])("asks for the column the roles lack: %s", (cause, detail) => {
    const error = failed({ reason: "invalid_mapping", cause });

    expect(readingProblem(error, REVIEW)).toEqual({
      tone: "attention",
      title: "Faltan columnas por elegir",
      detail,
    });
  });

  it("names the row and the column, as the file writes it, of a date in another order", () => {
    const error = failed({
      reason: "invalid_value",
      column: "FECHA TRANS",
      row: 14,
      cause: "date_format",
    });

    expect(readingProblem(error, REVIEW)).toEqual({
      tone: "attention",
      title: "No se lee la fila 15",
      detail: "“Fecha Trans” no es una fecha día/mes/año.",
    });
  });

  it("says how an amount should be written, as the file's numbers are", () => {
    const error = failed({
      reason: "invalid_value",
      column: "DEBITOS",
      row: 9,
      cause: "invalid_amount",
    });
    const point = { ...REVIEW, decimalSeparator: "." } as const;

    expect(readingProblem(error, REVIEW).detail).toBe(
      "“Débitos” no es un monto escrito como 1.234,56.",
    );
    expect(readingProblem(error, point).detail).toBe(
      "“Débitos” no es un monto escrito como 1,234.56.",
    );
  });

  it.each([
    [
      { reason: "invalid_value", column: "CREDITOS", cause: "both_amounts" },
      "Tiene salida y entrada a la vez.",
    ],
    [
      { reason: "invalid_value", column: "OFICINA", cause: "direction" },
      "“Oficina” no dice si el dinero entra o sale.",
    ],
    [{ reason: "missing_value", column: "DETALLE" }, "“Detalle” está vacía."],
  ])("says what a row's cell holds: %j", (details, detail) => {
    expect(readingProblem(failed({ ...details, row: 20 }), REVIEW)).toEqual({
      tone: "attention",
      title: "No se lee la fila 21",
      detail,
    });
  });

  it.each([
    [
      "date_format",
      "No reconocemos las fechas de “Fecha Trans”",
      "Elige cómo vienen en “Fechas”, abajo de la tabla.",
    ],
    [
      "direction",
      "No reconocemos las palabras de “Fecha Trans”",
      "No son las que usan los bancos para decir si el dinero entra o sale.",
    ],
  ])("names a column no row of which reads: %s", (cause, title, detail) => {
    const error = failed({
      reason: "invalid_value",
      column: "FECHA TRANS",
      cause,
    });

    expect(readingProblem(error, REVIEW)).toEqual({
      tone: "attention",
      title,
      detail,
    });
  });

  it("says no movement was read", () => {
    expect(readingProblem(failed({ reason: "no_movements" }), REVIEW)).toEqual({
      tone: "attention",
      title: "No leímos ningún movimiento",
      detail: "Revisa qué columnas tienen el dinero.",
    });
  });

  it("asks to check the columns otherwise", () => {
    const unknown = failed({ reason: "invalid_output" });
    const notAMapping = failed({ reason: "invalid_mapping" });

    expect(readingProblem(unknown, REVIEW)).toEqual({
      tone: "attention",
      title: "Así no podemos leer tu archivo",
      detail: "Revisa qué es cada columna.",
    });
    expect(readingProblem(notAMapping, REVIEW).detail).toBe(
      "Revisa qué es cada columna.",
    );
  });

  it("names a column by its name when the header has no such column", () => {
    const error = failed({
      reason: "invalid_value",
      column: "VALOR",
      row: 9,
      cause: "invalid_amount",
    });

    expect(readingProblem(error, REVIEW).detail).toBe(
      "“VALOR” no es un monto escrito como 1.234,56.",
    );
  });
});
