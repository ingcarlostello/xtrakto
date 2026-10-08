import { describe, expect, it } from "vitest";
import { normalizeDescription } from "./description.helpers";

// Spreadsheets and PDFs sometimes use a non-breaking space between words.
const NBSP = String.fromCodePoint(0xa0);

// Invented descriptions in the bank's style.
describe("normalizeDescription", () => {
  it.each([
    {
      label: "collapses a double space",
      raw: "COMPRA EN  TIENDA EJEMPLO",
      expected: "COMPRA EN TIENDA EJEMPLO",
    },
    {
      label: "trims both ends",
      raw: "  ABONO INTERESES AHORROS ",
      expected: "ABONO INTERESES AHORROS",
    },
    {
      label: "turns a tab into a space",
      raw: "PAGO QR\tCAFE DEL PARQUE",
      expected: "PAGO QR CAFE DEL PARQUE",
    },
    {
      label: "turns a line break into a space",
      raw: "TRANSF A\r\nANA PRUEBA",
      expected: "TRANSF A ANA PRUEBA",
    },
    {
      label: "turns a non-breaking space into a space",
      raw: `RETIRO${NBSP}CAJERO CENTRO`,
      expected: "RETIRO CAJERO CENTRO",
    },
    {
      label: "collapses mixed whitespace",
      raw: ` IMPTO ${NBSP} GOBIERNO\t 4X1000\n`,
      expected: "IMPTO GOBIERNO 4X1000",
    },
  ])("$label", ({ raw, expected }) => {
    expect(normalizeDescription(raw)).toBe(expected);
  });

  it("leaves a normalized description unchanged", () => {
    expect(normalizeDescription("PAGO PSE EMPRESA EJEMPLO")).toBe(
      "PAGO PSE EMPRESA EJEMPLO",
    );
  });

  it("keeps letter case, accents and symbols", () => {
    expect(normalizeDescription("Pago  Café Ñandú #2 (4x1000)")).toBe(
      "Pago Café Ñandú #2 (4x1000)",
    );
  });

  it.each(["", "   ", "\t\n"])("returns an empty string for %j", (raw) => {
    expect(normalizeDescription(raw)).toBe("");
  });

  it("gives the same result when applied twice", () => {
    const once = normalizeDescription(" COMPRA EN  TIENDA  EJEMPLO ");

    expect(normalizeDescription(once)).toBe(once);
  });
});
