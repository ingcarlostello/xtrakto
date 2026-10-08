import { describe, expect, it } from "vitest";
import { redactPii } from "./pii.helpers";

// Invented names, numbers and merchants only.
const HOLDER = "CARLOS ANDRES PRUEBA";

describe("redactPii", () => {
  it.each([
    {
      text: "TRANSFERENCIAS A NEQUI 3001234567",
      expected: "TRANSFERENCIAS A NEQUI [PHONE]",
    },
    { text: "PAGO A +57 3109876543", expected: "PAGO A [PHONE]" },
    { text: "PAGO A 573109876543", expected: "PAGO A [PHONE]" },
    {
      text: "PAGO PSE CONTRATO 12345678",
      expected: "PAGO PSE CONTRATO [NUMBER]",
    },
    { text: "PAGO FACTURA 123456", expected: "PAGO FACTURA [NUMBER]" },
    { text: "ENVIO A ana.prueba+1@correo.co", expected: "ENVIO A [EMAIL]" },
    { text: "TRANSF A MARIA LOPEZ", expected: "TRANSF A [NAME]" },
    { text: "TRANSF DE JUAN PEREZ GOM", expected: "TRANSF DE [NAME]" },
    { text: "PAGO LLAVE ANDREA RUI", expected: "PAGO LLAVE [NAME]" },
    { text: "pago llave andrea rui", expected: "pago llave [NAME]" },
    { text: "PAGO LLAVE 3001234567", expected: "PAGO LLAVE [PHONE]" },
  ])("redacts $text", ({ text, expected }) => {
    expect(redactPii(text)).toBe(expected);
  });

  it.each([
    "COMPRA EN  TIENDA EJEMPLO",
    "PAGO QR CAFE DEL PARQUE",
    "ABONO INTERESES AHORROS",
    "RETIRO CAJERO CENTRO 2",
    "IMPTO GOBIERNO 4X1000",
    "TRANSFERENCIAS A NEQUI",
    "PAGO PSE EMPRESA 12345",
  ])("keeps %j unchanged", (text) => {
    expect(redactPii(text)).toBe(text);
  });

  it.each([
    { text: `CONSIGNACION ${HOLDER}`, expected: "CONSIGNACION [NAME]" },
    { text: "ABONO carlos andres prueba", expected: "ABONO [NAME]" },
    { text: "TRASLADO CARLOS ANDRES PRU", expected: "TRASLADO [NAME]" },
    { text: "TRASLADO CARLOS AN", expected: "TRASLADO [NAME]" },
  ])(
    "redacts the holder's name, even truncated: $text",
    ({ text, expected }) => {
      expect(redactPii(text, { knownNames: [HOLDER] })).toBe(expected);
    },
  );

  it("doesn't redact a fragment shorter than four letters", () => {
    expect(redactPii("PAGO CAR", { knownNames: [HOLDER] })).toBe("PAGO CAR");
  });

  it("treats names as text, not as patterns", () => {
    expect(redactPii("ABONO A.B (C)", { knownNames: ["A.B (C)"] })).toBe(
      "ABONO A.B (C)".replace("A.B (C)", "[NAME]"),
    );
  });

  it("ignores empty known names", () => {
    expect(redactPii("COMPRA EN TIENDA", { knownNames: ["", "  "] })).toBe(
      "COMPRA EN TIENDA",
    );
  });
});
