import { describe, expect, it } from "vitest";
import { amountMinorSchema } from "../money/money.schemas";
import type { CategorizationRuleId } from "./categorization.types";
import { CATEGORIZATION_RULES } from "./categorization-rules.constants";
import { categorizeByRules } from "./categorization.helpers";
import { isPlainTitle, movementTitle } from "./movement-title.helpers";

const OUT = -9_000_000;
const IN = 9_000_000;

// A movement as ingestion saves it: the table's rule and its category.
const ruled = (description: string, amount: number) => {
  const found = categorizeByRules({
    descriptionNormalized: description,
    amountMinor: amountMinorSchema.parse(amount),
  });
  return {
    description,
    categoryId: found?.categoryId ?? null,
    categoryRuleId: found?.ruleId ?? null,
    llmTitle: null,
  };
};

describe("movementTitle", () => {
  it("titles every rule of the table in plain words", () => {
    const unfit = CATEGORIZATION_RULES.filter(
      ({ titleEs }) =>
        !/^[A-ZÁÉÍÓÚÑ]/.test(titleEs) ||
        titleEs.endsWith(".") ||
        titleEs.length > 40,
    );

    expect(unfit).toEqual([]);
  });

  it.each([
    ["ABONO INTERESES AHORROS", IN, "Intereses de tus ahorros"],
    ["TRANSFERENCIAS A NEQUI", OUT, "Envío por Nequi"],
    ["RETIRO CAJERO ATM PLAZA CENTR", OUT, "Retiro en cajero"],
    ["PAGO SUC VIRT TC VISA PESOS", OUT, "Pagaste tu tarjeta"],
    ["IMPTO GOBIERNO 4X1000", OUT, "Impuesto del 4x1000"],
    ["COMPRA EN MERCADO XYZ", OUT, "Compra en supermercado"],
    ["PAGO LLAVE INVERSIONES XY", OUT, "Pago con llave a una plataforma"],
    ["COMPRA EN TIENDA LA ESQUI", OUT, "Compra en un comercio"],
    ["0", OUT, "Sin descripción del banco"],
  ])("titles %s as its rule does", (description, amount, title) => {
    expect(movementTitle(ruled(description, amount))).toBe(title);
  });

  it.each([
    ["PAGO PSE Electrificadora de", "Pago de energía"],
    ["PAGO PSE VANTI SA ESP", "Pago de gas"],
    ["TRANSF A EMPRESA DE GAS DE CO", "Pago de gas"],
    ["PAGO PSE ACUEDUCTO DE BOGOTA", "Pago de agua"],
    ["PAGO PSE CLARO COLOMBIA", "Pago de celular o internet"],
    ["COMPRA EN DIRECTV", "Pago de televisión"],
    ["PAGO PSE EPM", "Pago de servicios"],
    ["RETIRO CORRESPONSAL BARRIO", "Retiro en corresponsal"],
  ])("names what %s paid where the rule's words say it", (text, title) => {
    expect(movementTitle(ruled(text, OUT))).toBe(title);
  });

  it("follows the category once the user or the LLM gave another than the rule's", () => {
    const keyPayment = ruled("PAGO LLAVE Maria Lopez", OUT);
    const drugstore = ruled("COMPRA EN AUDIFARMA", OUT);

    expect(movementTitle({ ...keyPayment, categoryId: "investment" })).toBe(
      "A tu inversión",
    );
    expect(movementTitle({ ...drugstore, categoryId: "health" })).toBe("Salud");
  });

  it("keeps the rule's title when the user confirmed its category", () => {
    expect(movementTitle(ruled("PAGO LLAVE Maria Lopez", OUT))).toBe(
      "Pago con llave",
    );
  });

  it("titles money no rule knew by the category the user or the LLM gave it", () => {
    const refund = ruled("ABONO DEVOLUCION COMPRA", IN);

    expect(movementTitle({ ...refund, categoryId: "refund" })).toBe(
      "Devolución",
    );
  });

  it("gives no title when neither a rule nor a category says what it was", () => {
    expect(movementTitle(ruled("ABONO DEVOLUCION COMPRA", IN))).toBeUndefined();
  });

  it("titles a movement whose rule the table dropped by its category", () => {
    // An id a later table might drop, as movements keep it (ADR 0025).
    const retired = "retired_rule" as CategorizationRuleId;

    expect(
      movementTitle({
        description: "PAGO PSE ALGO",
        categoryId: "utilities",
        categoryRuleId: retired,
        llmTitle: null,
      }),
    ).toBe("Pago de servicios");
  });

  it("titles a movement with the LLM's words while its category is the LLM's", () => {
    const drugstore = ruled("COMPRA EN AUDIFARMA", OUT);

    expect(
      movementTitle({
        ...drugstore,
        categoryId: "health",
        llmTitle: "Compra en una droguería",
      }),
    ).toBe("Compra en una droguería");
  });
});

describe("isPlainTitle", () => {
  it.each([
    "Compra en una droguería",
    "Devolución de una compra",
    "Pago de un curso en línea",
    "Pago de impuestos a la DIAN",
    "Pago de trámite a la Registraduría",
  ])("takes %j", (title) => {
    expect(isPlainTitle(title)).toBe(true);
  });

  it.each([
    ["a placeholder", "Pago a [NAME]"],
    ["digits", "Compra en tienda 24"],
    ["capitals inside", "Compra En Droguería"],
    ["a person's name", "Pago a Maria Lopez"],
    ["a word in capitals", "Compra en AUDIFARMA"],
    ["a capital inside a word", "Compra en eBay"],
    ["all capitals", "COMPRA EN DROGUERIA"],
    ["a lowercase start", "compra en una droguería"],
    ["a final period", "Compra en una droguería."],
    ["a space after it", "Compra en una droguería "],
    ["too short", "Pa"],
    ["too long", "Compra de muchas cosas en una tienda muy grande del centro"],
  ])("refuses a title with %s", (_, title) => {
    expect(isPlainTitle(title)).toBe(false);
  });
});
