import { describe, expect, it } from "vitest";
import type { CategoryId } from "../categories/category.types";
import { localDateSchema } from "../dates/date.schemas";
import { amountMinorSchema } from "../money/money.schemas";
import type { RecurringMovement } from "../recurring/recurring.types";
import { placesOf } from "./places.helpers";

type Paid = {
  readonly text: string;
  readonly categoryId?: CategoryId;
  /** The number paid: its HMAC and last 4 digits. */
  readonly reference?: readonly [string, string];
};

const movement = (
  date: string,
  amountMinor: number,
  { text, categoryId = "restaurants", reference }: Paid,
): RecurringMovement => ({
  date: localDateSchema.parse(date),
  amountMinor: amountMinorSchema.parse(amountMinor),
  descriptionRaw: text,
  referenceHash: reference?.[0] ?? null,
  referenceLast4: reference?.[1] ?? null,
  categoryId,
  categoryRuleId: null,
});

const CARD = { text: "COMPRA EN  APP DOMICILIOS" };
const QR = { text: "PAGO QR APP DOMICIL" };
const LUNCH = { text: "COMPRA EN  REST EL FOGON" };
const LUNCH_QR = { text: "PAGO QR EL FOGON" };

describe("placesOf", () => {
  it("joins a name the bank cut with the longest one it starts, the most money first", () => {
    expect(
      placesOf([
        movement("2026-07-03", -4_890_000, CARD),
        movement("2026-07-10", -3_650_000, QR),
        movement("2026-08-05", -18_600_000, LUNCH),
        movement("2026-08-12", -4_200_000, CARD),
      ]),
    ).toEqual([
      {
        title: "REST EL FOGON",
        bankTexts: ["COMPRA EN  REST EL FOGON"],
        total: { amountMinor: -18_600_000, count: 1 },
      },
      {
        title: "APP DOMICILIOS",
        bankTexts: ["COMPRA EN  APP DOMICILIOS", "PAGO QR APP DOMICIL"],
        total: { amountMinor: -12_740_000, count: 3 },
      },
    ]);
  });

  it("keeps apart names that don't start the same, as Pagos fijos does", () => {
    const titles = placesOf([
      movement("2026-08-05", -18_600_000, LUNCH),
      movement("2026-08-19", -9_000_000, LUNCH_QR),
    ]).map(({ title }) => title);

    expect(titles).toEqual(["REST EL FOGON", "EL FOGON"]);
  });

  it("titles a place as the bank last wrote it, and lists its texts the most used first, then the latest", () => {
    const [place] = placesOf([
      movement("2026-07-03", -100_000, QR),
      movement("2026-07-10", -100_000, CARD),
      movement("2026-07-17", -100_000, CARD),
      movement("2026-07-24", -100_000, { text: "PAGO QR APP DOMICILIOS" }),
    ]);

    expect(place?.title).toBe("APP DOMICILIOS");
    expect(place?.bankTexts).toEqual([
      "COMPRA EN  APP DOMICILIOS",
      "PAGO QR APP DOMICILIOS",
      "PAGO QR APP DOMICIL",
    ]);
  });

  it("groups the sends to a number by it, titled by its channel", () => {
    const nequi = (reference: readonly [string, string]) => ({
      text: "TRANSFERENCIAS A NEQUI",
      categoryId: "transfers_to_people" as const,
      reference,
    });

    expect(
      placesOf([
        movement("2026-08-25", -10_000_000, nequi(["h1", "1270"])),
        movement("2026-09-02", -5_000_000, nequi(["h2", "4567"])),
        movement("2026-09-12", -2_000_000, nequi(["h1", "1270"])),
      ]),
    ).toEqual([
      {
        title: "Nequi ••• 1270",
        bankTexts: ["TRANSFERENCIAS A NEQUI"],
        total: { amountMinor: -12_000_000, count: 2 },
      },
      {
        title: "Nequi ••• 4567",
        bankTexts: ["TRANSFERENCIAS A NEQUI"],
        total: { amountMinor: -5_000_000, count: 1 },
      },
    ]);
  });

  it("groups by its whole text what names no one, and keeps the bank's 0 and cash", () => {
    const people = { categoryId: "transfers_to_people" as const };
    const cash = { categoryId: "cash_withdrawal" as const };

    expect(
      placesOf([
        movement("2026-07-01", -2_000_000, {
          text: "TRANSFERENCIAS A NEQUI",
          ...people,
        }),
        movement("2026-07-20", -30_000_000, {
          text: "RETIRO CAJERO  ATM PLAZA CENTR",
          ...cash,
        }),
        movement("2026-08-25", -1_000_000, {
          text: "TRANSFERENCIAS A NEQUI",
          ...people,
        }),
        movement("2026-09-02", -20_000_000, {
          text: "RETIRO CORRESPONSAL CB",
          ...cash,
        }),
        movement("2026-09-05", -500_000, {
          text: "0",
          categoryId: "other_spending",
        }),
      ]).map(({ title, total }) => [title, total.count]),
    ).toEqual([
      ["ATM PLAZA CENTR", 1],
      ["RETIRO CORRESPONSAL CB", 1],
      ["TRANSFERENCIAS A NEQUI", 2],
      ["0", 1],
    ]);
  });

  it("puts the most movements first when the money ties, then the title", () => {
    expect(
      placesOf([
        movement("2026-07-03", -1_000_000, { text: "PAGO QR CAFE DEL PARQUE" }),
        movement("2026-07-04", -500_000, { text: "PAGO QR PANADERIA SAN" }),
        movement("2026-07-05", -500_000, { text: "PAGO QR PANADERIA SAN" }),
        movement("2026-07-06", -1_000_000, { text: "PAGO QR BAR ALTO" }),
      ]).map(({ title }) => title),
    ).toEqual(["PANADERIA SAN", "BAR ALTO", "CAFE DEL PARQUE"]);
  });

  it("finds no place without movements", () => {
    expect(placesOf([])).toEqual([]);
  });
});
