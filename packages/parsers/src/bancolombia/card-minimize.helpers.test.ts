import { describe, expect, it } from "vitest";
import cardBasic from "../../fixtures/card-basic.json";
import cardBroken from "../../fixtures/card-broken.json";
import cardDollars from "../../fixtures/card-dollars.json";
import { fixtureContent } from "../../fixtures/fixture.utils";
import quarterlyBasic from "../../fixtures/quarterly-basic.json";
import { minimizeCard } from "./card-minimize.helpers";
import { bancolombiaCardParser } from "./card-parser.helpers";

const CARDS = [
  ["card-basic", cardBasic],
  ["card-dollars", cardDollars],
  ["card-broken", cardBroken],
].map(([name, fixture]) => [name, fixtureContent(fixture)] as const);

const LONG_NUMBER = /\d{6,}/;

describe("minimizeCard", () => {
  it.each(CARDS)(
    "parses %s's minimized content as the original",
    (_, content) => {
      expect(bancolombiaCardParser.parse(minimizeCard(content))).toEqual(
        bancolombiaCardParser.parse(content),
      );
    },
  );

  it("keeps a row in a table that isn't a movement, so it warns at the same row", () => {
    const [, basic] = CARDS[0] ?? [];
    if (basic?.type !== "spreadsheet") throw new Error("Not a spreadsheet");
    const [pesos, ...others] = basic.sheets;
    if (pesos === undefined) throw new Error("No sheet in pesos");
    const rows = pesos.rows.map((row, index) =>
      index === 33 ? [null, "SUBTOTAL", "CARGOS 1234567"] : row,
    );
    const content = { ...basic, sheets: [{ ...pesos, rows }, ...others] };
    const minimized = bancolombiaCardParser.parse(minimizeCard(content));

    expect(minimized).toEqual(bancolombiaCardParser.parse(content));
    expect(minimized.ok && minimized.value.warnings).toEqual([
      { code: "UNEXPECTED_ROW", sourceRow: 33 },
    ]);
    expect(JSON.stringify(minimizeCard(content))).not.toContain("1234567");
  });

  it.each(CARDS)("minimizes %s once and for all", (_, content) => {
    const minimized = minimizeCard(content);

    expect(minimizeCard(minimized)).toEqual(minimized);
    expect(bancolombiaCardParser.canParse(minimized)).toBe(true);
  });

  it("keeps neither the address, the city or the department, nor the authorizations, nor any rate but the monthly one for purchases", () => {
    const sent = JSON.stringify(minimizeCard(fixtureContent(cardDollars)));

    for (const text of [
      "CALLE 10 # 20-30 APTO 101",
      "MEDELLIN (ANTIOQUIA)",
      "Dirección",
      "Departamento",
      "Tasa Efectivo Anual",
      "25.3400 %",
      "Compra un mes",
      "C01234",
      "Interés anual (%)",
      "************1234",
      '"PESOS","rows"',
    ]) {
      expect(sent).not.toContain(text);
    }
    expect(sent).toContain("ANA MARIA PRUEBA GOMEZ");
    expect(sent).toContain('"1234"');
    expect(sent).toContain('"Compra 2 - 36 meses","1.9000 %"');
  });

  it("leaves no long number, its descriptions' masked", () => {
    const sent = JSON.stringify(minimizeCard(fixtureContent(cardBasic)));

    expect(
      LONG_NUMBER.test(sent.replaceAll(/\d{1,3}(\.\d{3})+,\d+/g, "")),
    ).toBe(false);
    expect(sent).toContain("TIENDA EJEMPLO *****6789");
  });

  it("keeps of the sheet in dollars only its currency and its movements' dates", () => {
    const content = minimizeCard(fixtureContent(cardDollars));
    if (content.type !== "spreadsheet") throw new Error("Not a spreadsheet");
    const [, dollars] = content.sheets;
    const texts = (dollars?.rows ?? []).flat().filter((cell) => cell !== null);

    expect(texts).toEqual([
      "Moneda: ",
      "DOLARES",
      "Movimientos durante el periodo",
      "Fecha",
      "Movimientos",
      "Valor Movimiento",
      "Número de cuotas",
      "Valor cuota/abono",
      "Interés mensual (%)",
      "Saldo pendiente",
      "21/09/2026",
      "12/09/2026",
    ]);
  });

  it("returns content it doesn't recognize as it was", () => {
    const pdf = { type: "pdf" as const, pages: [] };

    expect(minimizeCard(pdf)).toBe(pdf);
    expect(minimizeCard(fixtureContent(quarterlyBasic)).type).toBe(
      "spreadsheet",
    );
  });
});
