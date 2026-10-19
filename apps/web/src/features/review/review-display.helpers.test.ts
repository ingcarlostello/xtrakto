import { amountMinorSchema, type CategoryId } from "@xtrakto/core";
import { describe, expect, it } from "vitest";
import {
  answeredTitle,
  bannerTitle,
  outcomeText,
  pendingOf,
  reviewStatus,
} from "./review-display.helpers";
import type {
  GroupMovements,
  ReviewGroup,
  ReviewOutcome,
} from "./review.types";

const movements = (
  count: number,
  texts: GroupMovements["texts"] = [],
): GroupMovements => ({
  texts,
  amountMinor: amountMinorSchema.parse(-count * 1_000),
  count,
});

const outcome = (
  categoryId: CategoryId,
  count: number,
  said = "Son tuyas",
): ReviewOutcome => ({ said, categoryId, isGuessKept: false, count });

const open = (count: number, answeredCount = 0): ReviewGroup => ({
  id: "key_people",
  pending: movements(count),
  answered:
    answeredCount === 0
      ? null
      : {
          ...movements(answeredCount),
          outcomes: [outcome("transfers_to_people", answeredCount)],
        },
});

const closed = (count: number): ReviewGroup => ({
  id: "own_name",
  pending: null,
  answered: {
    ...movements(count),
    outcomes: [outcome("own_account_transfer", count)],
  },
});

describe("answeredTitle", () => {
  const name = "Transferencias a tu nombre";
  const texts = (...printed: string[]) =>
    movements(
      printed.length,
      printed.map((text) => ({ text, count: 1 })),
    );

  it.each([
    [["TRANSF A ANA LUCIA MAR"], `${name} (“TRANSF A ANA LUCIA MAR”)`],
    [
      ["TRANSF A ANA LUCIA MAR", "Ana Lucia Mar"],
      `${name} (“TRANSF A ANA LUCIA MAR” y “Ana Lucia Mar”)`,
    ],
    [
      ["TRANSF A ANA LUCIA MAR", "Ana Lucia Mar", "TRANSF A ANA L", "ANA LUC"],
      `${name} (“TRANSF A ANA LUCIA MAR”, “Ana Lucia Mar” y 2 más)`,
    ],
  ])("quotes the bank's texts as printed: %j", (printed, title) => {
    expect(answeredTitle(name, texts(...printed))).toBe(title);
  });

  it("keeps the bank's double spaces", () => {
    expect(answeredTitle("Compras", texts("COMPRA EN  TIENDA"))).toBe(
      "Compras (“COMPRA EN  TIENDA”)",
    );
  });

  it("quotes nothing for the bank's 0, which names nothing", () => {
    expect(answeredTitle("Movimientos sin descripción", texts("0"))).toBe(
      "Movimientos sin descripción",
    );
  });
});

describe("outcomeText", () => {
  it.each<[ReviewOutcome, string]>([
    [
      outcome("own_account_transfer", 5),
      "Son tuyas: 5 movimientos cuentan como movido.",
    ],
    [
      outcome("other_spending", 1, "Compras"),
      "Compras: 1 movimiento cuenta como gasto real.",
    ],
    [
      outcome("income_transfer", 2, "Es un ingreso"),
      "Es un ingreso: 2 movimientos cuentan como ingreso.",
    ],
    [
      { ...outcome("investment", 2, "No sé"), isGuessKept: true },
      "No sé: 2 movimientos siguen como movido, nuestra mejor suposición.",
    ],
    [
      { ...outcome("transfers_to_people", 1, "No sé"), isGuessKept: true },
      "No sé: 1 movimiento sigue como gasto real, nuestra mejor suposición.",
    ],
  ])("says what the movements count as now: %s", (counted, text) => {
    expect(outcomeText(counted)).toBe(text);
  });

  it("names no kind for a category the table no longer has", () => {
    // An id a later version of categories.json might drop.
    const dropped = "dropped_category" as CategoryId;

    expect(outcomeText(outcome(dropped, 3, "Otra"))).toBe(
      "Otra: 3 movimientos.",
    );
  });
});

describe("pendingOf", () => {
  it("counts the open groups and what waits in them, not what was answered", () => {
    expect(pendingOf([open(3, 2), closed(5), open(1)])).toEqual({
      groups: 2,
      movements: 4,
    });
  });
});

describe("reviewStatus", () => {
  it("counts every group of the quarter and its movements, answered or not", () => {
    expect(reviewStatus([closed(5), closed(9), open(4, 1)]).title).toBe(
      "3 grupos · 19 movimientos",
    );
  });

  it.each([
    [1, "Menos de un minuto"],
    [2, "Un minuto"],
    [4, "Unos 2 minutos"],
    [5, "Unos 3 minutos"],
  ])("says about how long %i open groups take", (openGroups, detail) => {
    const groups = Array.from({ length: openGroups }, () => open(1));

    expect(reviewStatus([closed(2), ...groups])).toEqual({
      tone: "info",
      title: expect.any(String),
      detail,
    });
  });

  it("says everything is answered once no group is open", () => {
    expect(reviewStatus([closed(1)])).toEqual({
      tone: "ok",
      title: "1 grupo · 1 movimiento",
      detail: "Todo respondido",
    });
  });
});

describe("bannerTitle", () => {
  it.each([
    [
      { groups: 4, movements: 24 },
      "Tienes 4 grupos por revisar (24 movimientos)",
    ],
    [{ groups: 1, movements: 1 }, "Tienes 1 grupo por revisar (1 movimiento)"],
  ])("counts what waits: %j", (pending, title) => {
    expect(bannerTitle(pending)).toBe(title);
  });
});
