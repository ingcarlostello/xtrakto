import type { TransactionListItem } from "@xtrakto/db";
import { describe, expect, it } from "vitest";
import { descriptionView } from "./movement-row.helpers";

describe("descriptionView", () => {
  // A movement no rule or category names, unless a test says so.
  const movement = (
    descriptionRaw: string,
    changes: Partial<
      Pick<TransactionListItem, "categoryId" | "categoryRuleId" | "llmTitle">
    > = {},
  ) => ({
    descriptionRaw,
    categoryId: null,
    categoryRuleId: null,
    llmTitle: null,
    ...changes,
  });

  it("titles a movement in plain words over the bank's text as printed", () => {
    expect(
      descriptionView(
        movement("COMPRA EN  MERCADO XYZ", {
          categoryId: "groceries",
          categoryRuleId: "merchant_groceries",
        }),
      ),
    ).toEqual({
      kind: "titled",
      title: "Compra en supermercado",
      raw: "COMPRA EN  MERCADO XYZ",
    });
  });

  it("titles a payment no rule names with the LLM's words while its category is the LLM's", () => {
    expect(
      descriptionView(
        movement("COMPRA EN AUDIFARMA", {
          categoryId: "health",
          categoryRuleId: "unknown_merchant",
          llmTitle: "Compra en una droguería",
        }),
      ),
    ).toEqual({
      kind: "titled",
      title: "Compra en una droguería",
      raw: "COMPRA EN AUDIFARMA",
    });
  });

  it("keeps the bank's text as printed when nothing names the movement", () => {
    expect(descriptionView(movement("ABONO  EJEMPLO"))).toEqual({
      kind: "bank",
      text: "ABONO  EJEMPLO",
    });
  });

  it.each(["0", " 0 "])(
    "reads the bank's %j as no description, whatever its category",
    (raw) => {
      expect(
        descriptionView(movement(raw, { categoryId: "groceries" })),
      ).toEqual({ kind: "none", raw });
    },
  );

  it("keeps a text that only starts with a zero", () => {
    expect(descriptionView(movement("0 COMISION"))).toEqual({
      kind: "bank",
      text: "0 COMISION",
    });
  });
});
