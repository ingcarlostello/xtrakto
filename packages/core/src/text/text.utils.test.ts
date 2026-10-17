import { describe, expect, it } from "vitest";
import { foldText } from "./text.utils";

describe("foldText", () => {
  it.each([
    ["Pago  PSE Compañía", "PAGO PSE COMPANIA"],
    ["  TRANSF A Ana Prueba ", "TRANSF A ANA PRUEBA"],
    ["PAGO LLAVE COMIDAS RÁ", "PAGO LLAVE COMIDAS RA"],
    // A decomposed accent, as some systems write it.
    ["Ü y ñ", "U Y N"],
    ["IMPTO GOBIERNO 4X1000", "IMPTO GOBIERNO 4X1000"],
  ])("writes %j as %j", (text, expected) => {
    expect(foldText(text)).toBe(expected);
  });
});
