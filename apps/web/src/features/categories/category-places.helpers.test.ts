import {
  amountMinorSchema,
  type CategorizationRuleId,
  type CategoryId,
  localDateSchema,
} from "@xtrakto/core";
import type { PeriodMovement } from "@xtrakto/db";
import { describe, expect, it } from "vitest";
import { placesView } from "./category-places.helpers";

type Row = readonly [
  amount: number,
  text: string,
  as?: readonly [CategoryId, CategorizationRuleId],
];

const FOOD = ["restaurants", "merchant_restaurants"] as const;
const SALARY = ["income_transfer", "interbank_in"] as const;

const movement = (
  [amount, text, [categoryId, rule] = FOOD]: Row,
  day: number,
) =>
  ({
    date: localDateSchema.parse(`2026-08-${String(day + 1).padStart(2, "0")}`),
    amountMinor: amountMinorSchema.parse(amount),
    balanceAfterMinor: null,
    descriptionRaw: text,
    referenceHash: null,
    referenceLast4: null,
    categoryId,
    categoryRuleId: rule,
  }) satisfies PeriodMovement;

const detailOf = (rows: readonly Row[]) => ({
  categoryId: "restaurants" as const,
  movements: rows.map(movement),
});

// v8-06's places, in short, beside a salary of another category.
const ROWS: readonly Row[] = [
  [-4_890_000, "COMPRA EN  APP DOMICILIOS"],
  [-3_650_000, "PAGO QR APP DOMICIL"],
  [-18_600_000, "COMPRA EN  REST EL FOGON"],
  [-4_200_000, "COMPRA EN  APP DOMICILIOS"],
  [-1_840_000, "PAGO QR CAFE LA ESQUIN"],
  [320_000_000, "PAGO INTERBANC EMPRESA EJEMPLO", SALARY],
];

describe("placesView", () => {
  it("lists where the category's money went, the most first, with its bar, count and the ways the bank wrote it", () => {
    expect(placesView(detailOf(ROWS))).toEqual({
      rows: [
        {
          key: "0-REST EL FOGON",
          title: "REST EL FOGON",
          amount: "$186.000",
          barPercent: 100,
          note: "1 movimiento · COMPRA EN  REST EL FOGON",
        },
        {
          key: "1-APP DOMICILIOS",
          title: "APP DOMICILIOS",
          amount: "$127.400",
          barPercent: 68,
          note: "3 movimientos · COMPRA EN  APP DOMICILIOS · también PAGO QR APP DOMICIL",
        },
        {
          key: "2-CAFE LA ESQUIN",
          title: "CAFE LA ESQUIN",
          amount: "$18.400",
          barPercent: 10,
          note: "1 movimiento · PAGO QR CAFE LA ESQUIN",
        },
      ],
    });
  });

  it("names up to two other ways the bank wrote a place, then how many more", () => {
    const view = placesView(
      detailOf([
        [-100_000, "COMPRA EN  APP DOMICILIOS"],
        [-100_000, "COMPRA EN  APP DOMICILIOS"],
        [-100_000, "PAGO QR APP DOMICILIOS"],
        [-100_000, "PAGO QR APP DOMICIL"],
        [-100_000, "PAGO LLAVE APP DOMICILI"],
      ]),
    );

    expect(view?.rows[0]?.note).toBe(
      "5 movimientos · COMPRA EN  APP DOMICILIOS · también PAGO LLAVE APP DOMICILI, PAGO QR APP DOMICIL y 1 más",
    );
  });

  it("lists five places and says how many more there are and what they took", () => {
    const view = placesView(
      detailOf(
        ["UNO", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE"].map(
          (name, index): Row => [
            -(700_000 - index * 100_000),
            `PAGO QR CAFE ${name}`,
          ],
        ),
      ),
    );

    expect(view?.rows.map(({ title }) => title)).toEqual([
      "CAFE UNO",
      "CAFE DOS",
      "CAFE TRES",
      "CAFE CUATRO",
      "CAFE CINCO",
    ]);
    expect(view?.more).toBe("Y 2 lugares más: $3 mil.");
  });

  it("titles the bank's 0 as a place without a description", () => {
    const view = placesView(detailOf([[-500_000, "0"]]));

    expect(view?.rows[0]?.title).toBe("Sin descripción del banco");
  });

  it("lists nothing when the category took nothing", () => {
    expect(
      placesView(
        detailOf([[320_000_000, "PAGO INTERBANC EMPRESA EJEMPLO", SALARY]]),
      ),
    ).toBeNull();
  });
});
