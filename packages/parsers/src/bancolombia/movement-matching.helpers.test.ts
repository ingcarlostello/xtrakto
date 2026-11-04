import { amountMinorSchema, localDateSchema } from "@xtrakto/core";
import { describe, expect, it } from "vitest";
import { INTEREST_DESCRIPTION } from "./bancolombia.constants";
import {
  type MatchableMovement,
  matchMovements,
} from "./movement-matching.helpers";

/** A movement's day, text and amount. */
type Line = readonly [date: string, description: string, amount: number];

const NEQUI = "TRANSFERENCIAS A NEQUI";
const COMBINING_ACUTE = String.fromCodePoint(0x301);

const movement = (
  id: string,
  [date, description, amount]: Line,
  position = 0,
): MatchableMovement => ({
  id,
  date: localDateSchema.parse(date),
  descriptionNormalized: description,
  amountMinor: amountMinorSchema.parse(amount),
  position,
});

const interest = (id: string, date: string, amount: number) =>
  movement(id, [date, INTEREST_DESCRIPTION, amount]);

describe("matchMovements", () => {
  it("pairs each exported movement with the statement's that has its day, text and amount", () => {
    const quarterly = [
      movement("q1", ["2026-07-03", "COMPRA EN TIENDA LA ESQUI", -4_590_000]),
      movement("q2", ["2026-07-10", "PAGO INTERBANC EMPRESA", 320_000_000]),
    ];
    const exported = [
      movement("e1", ["2026-07-10", "PAGO INTERBANC EMPRESA", 320_000_000]),
      movement("e2", ["2026-07-03", "COMPRA EN TIENDA LA ESQUI", -4_590_000]),
    ];

    expect(matchMovements(quarterly, exported)).toEqual([
      { exportedId: "e2", quarterlyId: "q1" },
      { exportedId: "e1", quarterlyId: "q2" },
    ]);
  });

  it("finds interest on the day before the export dates it, when it was paid", () => {
    expect(
      matchMovements(
        [interest("q1", "2026-07-01", 289), interest("q2", "2026-07-02", 271)],
        [interest("e1", "2026-07-02", 289), interest("e2", "2026-07-03", 271)],
      ),
    ).toEqual([
      { exportedId: "e1", quarterlyId: "q1" },
      { exportedId: "e2", quarterlyId: "q2" },
    ]);
  });

  it("finds the two interest rows of a month's last day: the day before's and its own", () => {
    const quarterly = [
      interest("q30", "2026-07-30", 305),
      interest("q31", "2026-07-31", 312),
    ];
    const exported = [
      { ...interest("e1", "2026-07-31", 312), position: 4 },
      { ...interest("e2", "2026-07-31", 305), position: 5 },
    ];

    expect(matchMovements(quarterly, exported)).toEqual([
      { exportedId: "e1", quarterlyId: "q31" },
      { exportedId: "e2", quarterlyId: "q30" },
    ]);
  });

  it("moves a day for interest alone, and never more than one", () => {
    expect(
      matchMovements(
        [
          movement("q1", ["2026-07-03", "COMPRA EN TIENDA", -100]),
          interest("q2", "2026-07-30", 312),
        ],
        [
          movement("e1", ["2026-07-04", "COMPRA EN TIENDA", -100]),
          interest("e2", "2026-08-01", 312),
        ],
      ),
    ).toEqual([]);
  });

  it("takes a text the statement cut before an accented letter as the same", () => {
    expect(
      matchMovements(
        [movement("q1", ["2026-08-12", "PAGO LLAVE COMIDAS R", -1_500_000])],
        [movement("e1", ["2026-08-12", "PAGO LLAVE COMIDAS RÁ", -1_500_000])],
      ),
    ).toEqual([{ exportedId: "e1", quarterlyId: "q1" }]);
  });

  it("reads an accented letter written in two parts as one", () => {
    const decomposed = `PAGO LLAVE COMIDAS RA${COMBINING_ACUTE}`;

    expect(
      matchMovements(
        [movement("q1", ["2026-08-12", "PAGO LLAVE COMIDAS R", -1_500_000])],
        [movement("e1", ["2026-08-12", decomposed, -1_500_000])],
      ),
    ).toEqual([{ exportedId: "e1", quarterlyId: "q1" }]);
  });

  it("tells apart texts that differ in more than a cut letter, and amounts", () => {
    expect(
      matchMovements(
        [
          movement("q1", ["2026-08-12", "PAGO LLAVE COMIDAS", -1_500_000]),
          movement("q2", ["2026-08-12", "PAGO LLAVE COMIDAS RA", -1_500_000]),
          movement("q3", ["2026-08-12", "COMPRA EN TIENDA", -100]),
        ],
        [
          movement("e1", ["2026-08-12", "PAGO LLAVE COMIDAS RÁ", -1_500_000]),
          movement("e2", ["2026-08-12", "COMPRA EN TIENDA", -101]),
        ],
      ),
    ).toEqual([]);
  });

  it("pairs identical movements of a day in the bank's order, each once", () => {
    const send: Line = ["2026-08-25", NEQUI, -10_000];
    const quarterly = [movement("q1", send, 7), movement("q2", send, 8)];
    const exported = [
      movement("e2", send, 2),
      movement("e1", send, 1),
      movement("e3", send, 3),
    ];

    expect(matchMovements(quarterly, exported)).toEqual([
      { exportedId: "e1", quarterlyId: "q1" },
      { exportedId: "e2", quarterlyId: "q2" },
    ]);
  });
});
