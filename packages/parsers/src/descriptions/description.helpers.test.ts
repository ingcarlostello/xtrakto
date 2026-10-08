import { describe, expect, it } from "vitest";
import { maskLongNumbers, normalizeDescription } from "./description.helpers";

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

// Invented numbers only.
describe("maskLongNumbers", () => {
  it.each([
    {
      label: "an account number",
      text: "INTERES INV VIRT 27608017525",
      masked: "INTERES INV VIRT *******7525",
    },
    {
      label: "a phone number",
      text: "PAGO LLAVE 3001234567",
      masked: "PAGO LLAVE ******4567",
    },
    { label: "six digits", text: "PAGO PSE 123456", masked: "PAGO PSE **3456" },
    {
      label: "several numbers",
      text: "TRANSF A EMPRESA 185040 1790203589",
      masked: "TRANSF A EMPRESA **5040 ******3589",
    },
    {
      label: "digits next to letters",
      text: "REF1234567X",
      masked: "REF***4567X",
    },
  ])("keeps only the last four digits of $label", ({ text, masked }) => {
    expect(maskLongNumbers(text)).toBe(masked);
    expect(maskLongNumbers(text)).toHaveLength(text.length);
  });

  it.each([
    "COMPRA EN  EDS LA 27",
    "IMPTO GOBIERNO 4X1000",
    "PAGO QR 12345",
    "COMPRA EN  FRISBY H04",
  ])("leaves %j unchanged", (text) => {
    expect(maskLongNumbers(text)).toBe(text);
  });

  it("gives the same result when applied twice", () => {
    const once = maskLongNumbers("INTERES INV VIRT 27608017525");

    expect(maskLongNumbers(once)).toBe(once);
  });
});
