import type { AmountMinor, LocalDate } from "@xtrakto/core";
import type { ExportMovement } from "@xtrakto/db";
import { describe, expect, it } from "vitest";
import { amountCell, movementsCsv, textCell } from "./movements-csv.helpers";

// Invented movements.
const movement = (change: Partial<ExportMovement> = {}): ExportMovement => ({
  date: "2026-07-03" as LocalDate,
  bankId: "bancolombia",
  accountType: "savings",
  accountLast4: "8901",
  descriptionRaw: "PAGO PSE Empresa de Energia",
  amountMinor: -15_000_000 as AmountMinor,
  balanceAfterMinor: 123_456_78 as AmountMinor,
  categoryId: "utilities",
  isPendingReview: false,
  referenceLast4: null,
  counts: true,
  ...change,
});

const linesOf = (csv: string) => csv.split("\r\n");

describe("movementsCsv", () => {
  it("writes a header and a row per movement, for Excel in Spanish", () => {
    const csv = movementsCsv([movement()], { withCounts: false });

    // The browser adds the byte order mark when it saves the file.
    expect(csv.startsWith("Fecha;")).toBe(true);
    expect(linesOf(csv)).toEqual([
      "Fecha;Cuenta;Texto del banco;Valor;Saldo después;Tipo;Categoría;Por revisar;Canal;Referencia",
      "03/07/2026;Cuenta de ahorros · Bancolombia ••••8901;PAGO PSE Empresa de Energia;-150000,00;123456,78;Gasto real;Servicios del hogar;No;PSE;",
      "",
    ]);
  });

  it("says which movements count when the export is every one", () => {
    const csv = movementsCsv(
      [movement(), movement({ counts: false, referenceLast4: "4567" })],
      { withCounts: true },
    );
    const [header, counted, hidden] = linesOf(csv);

    expect(header?.endsWith(";Referencia;Cuenta en tu resumen")).toBe(true);
    expect(counted?.endsWith(";;Sí")).toBe(true);
    expect(hidden?.endsWith(";4567;No")).toBe(true);
  });

  it("leaves the kind and category empty for money no rule knows, and marks a guess", () => {
    const [, row] = linesOf(
      movementsCsv(
        [
          movement({
            descriptionRaw: "0",
            amountMinor: 5_000 as AmountMinor,
            categoryId: null,
            isPendingReview: true,
          }),
        ],
        { withCounts: false },
      ),
    );

    expect(row).toBe(
      "03/07/2026;Cuenta de ahorros · Bancolombia ••••8901;0;50,00;123456,78;;;Sí;;",
    );
  });
});

describe("amountCell", () => {
  it.each([
    [-15_000_000, "-150000,00"],
    [1_234_56, "1234,56"],
    [5, "0,05"],
    [-5, "-0,05"],
    [0, "0,00"],
    [null, ""],
  ])("writes %s as %j", (amount, cell) => {
    expect(amountCell(amount as AmountMinor | null)).toBe(cell);
  });
});

describe("textCell", () => {
  it.each([
    ['=HYPERLINK("http://x")', '"\'=HYPERLINK(""http://x"")"'],
    ["+57 300", "'+57 300"],
    ["-TRANSF", "'-TRANSF"],
    ["@SUM(A1)", "'@SUM(A1)"],
  ])("keeps %j from running as a formula", (text, cell) => {
    expect(textCell(text)).toBe(cell);
  });

  it("quotes a text with a separator or quotes", () => {
    expect(textCell('COMPRA EN "LA TIENDA"; NORTE')).toBe(
      '"COMPRA EN ""LA TIENDA""; NORTE"',
    );
    expect(textCell("COMPRA EN TIENDA")).toBe("COMPRA EN TIENDA");
  });
});
