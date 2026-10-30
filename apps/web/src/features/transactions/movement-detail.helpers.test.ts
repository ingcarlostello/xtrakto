import {
  amountMinorSchema,
  type CategorizationRuleId,
  localDateSchema,
  periodSchema,
} from "@xtrakto/core";
import type { MovementDetail } from "@xtrakto/db";
import { describe, expect, it } from "vitest";
import { movementDetailView } from "./movement-detail.helpers";

const QUARTER = {
  formatId: "bancolombia-savings-quarterly",
  period: periodSchema.parse({ from: "2026-06-30", to: "2026-09-30" }),
};

// A utility paid through PSE, as v8-03 details it: a rule knew it.
const detail = (changes: Partial<MovementDetail> = {}): MovementDetail => ({
  id: "m1",
  date: localDateSchema.parse("2026-09-27"),
  descriptionRaw: "PAGO PSE EMPRESA DE ENERGIA",
  descriptionNormalized: "PAGO PSE EMPRESA DE ENERGIA",
  amountMinor: amountMinorSchema.parse(-18_200_000),
  balanceAfterMinor: amountMinorSchema.parse(879_389_000),
  categoryId: "utilities",
  isPendingReview: false,
  referenceHash: null,
  referenceKind: "none",
  referenceLast4: null,
  categorySource: "rule",
  categoryRuleId: "utility_payment",
  statement: QUARTER,
  ...changes,
});

describe("movementDetailView", () => {
  it("shows a movement's title in plain words, its fields and the rule's reason for its category", () => {
    expect(movementDetailView(detail(), "a1")).toEqual({
      id: "m1",
      title: "Pago de energía",
      isBankText: false,
      bankText: "PAGO PSE EMPRESA DE ENERGIA",
      date: "Domingo 27 de septiembre de 2026",
      amount: "−$182.000",
      tone: "spending",
      categoryId: "utilities",
      facts: [
        { label: "Canal", value: "PSE" },
        { label: "Fuente", value: "Extracto trimestral jul–sep 2026" },
        { label: "Saldo después", value: "$8.793.890" },
      ],
      isGuess: false,
      reason:
        "los pagos de luz, agua, gas, internet o celular son servicios del hogar. Regla del sistema, sin IA.",
    });
  });

  it("shows a best guess in ink, with its reference's digits and the way to the review of its quarter", () => {
    const send = detail({
      date: localDateSchema.parse("2026-08-20"),
      descriptionRaw: "TRANSFERENCIAS A NEQUI",
      amountMinor: amountMinorSchema.parse(-4_800_000),
      balanceAfterMinor: null,
      categoryId: "transfers_to_people",
      isPendingReview: true,
      referenceLast4: "1270",
      categoryRuleId: "nequi_out_number",
      statement: {
        formatId: "bancolombia-movements-export",
        period: periodSchema.parse({ from: "2026-08-15", to: "2026-08-31" }),
      },
    });

    expect(movementDetailView(send, "a1")).toMatchObject({
      tone: "neutral",
      facts: [
        { label: "Canal", value: "Nequi" },
        { label: "Referencia", value: "••• 1270" },
        { label: "Fuente", value: "Movimientos 15–31 ago 2026" },
      ],
      isGuess: true,
      reason:
        "un envío a Nequi es un pago a una persona, salvo que el número sea tuyo. Regla del sistema, sin IA.",
      reviewHref: {
        pathname: "/review",
        query: { account: "a1", period: "2026-q3" },
      },
    });
  });

  it("says the user decided a category they gave", () => {
    const answered = detail({
      categoryId: "own_account_transfer",
      categorySource: "user",
      categoryRuleId: "pse_card",
    });

    expect(movementDetailView(answered, "a1")).toMatchObject({
      tone: "moved",
      reason: "lo decidiste tú.",
    });
  });

  it("says the AI categorized it from the bank's text, without its amounts or the user's data", () => {
    const named = detail({
      descriptionRaw: "COMPRA EN AUDIFARMA",
      categoryId: "health",
      categorySource: "llm",
      categoryRuleId: "unknown_merchant",
    });

    expect(movementDetailView(named, "a1")).toMatchObject({
      tone: "spending",
      isGuess: false,
      reason:
        "la IA lo clasificó por el texto del banco, sin montos ni datos tuyos.",
    });
  });

  it("says no rule knows money in without a category", () => {
    const unknown = detail({
      descriptionRaw: "ABONO EJEMPLO",
      amountMinor: amountMinorSchema.parse(100_000),
      categoryId: null,
      categorySource: null,
      categoryRuleId: null,
    });

    expect(movementDetailView(unknown, "a1")).toMatchObject({
      tone: "neutral",
      facts: [
        { label: "Fuente", value: "Extracto trimestral jul–sep 2026" },
        { label: "Saldo después", value: "$8.793.890" },
      ],
      reason: "ninguna regla conoce este movimiento todavía.",
    });
  });

  it("titles a movement nothing names by its bank text, as printed", () => {
    const unknown = detail({
      descriptionRaw: "ABONO  EJEMPLO",
      amountMinor: amountMinorSchema.parse(100_000),
      categoryId: null,
      categorySource: null,
      categoryRuleId: null,
    });

    expect(movementDetailView(unknown, "a1")).toMatchObject({
      title: "ABONO  EJEMPLO",
      isBankText: true,
    });
  });

  it("titles the bank's 0 as a movement it didn't describe, keeping its text", () => {
    expect(
      movementDetailView(detail({ descriptionRaw: "0" }), "a1"),
    ).toMatchObject({ title: "Sin descripción del banco", bankText: "0" });
  });

  it("says only that the system gave a category whose rule the table no longer has", () => {
    // An id a later table might drop, as movements keep it (ADR 0025).
    const retired = "retired_rule" as CategorizationRuleId;

    expect(
      movementDetailView(detail({ categoryRuleId: retired }), "a1").reason,
    ).toBe("Regla del sistema, sin IA.");
  });
});
