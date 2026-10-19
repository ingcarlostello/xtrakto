import {
  amountMinorSchema,
  type CategoryId,
  localDateSchema,
} from "@xtrakto/core";
import type { TransactionListItem } from "@xtrakto/db";
import { describe, expect, it } from "vitest";
import type { KindTotal, KindTotals } from "@/utils/kind-totals.helpers";
import type { MovementPeriod } from "@/utils/transactions-url.helpers";
import {
  filterOptions,
  kindTiles,
  movementTone,
  selectionOf,
} from "./kind-view.helpers";

const amount = (value: number) => amountMinorSchema.parse(value);

const total = (amountMinor: number, count: number): KindTotal => ({
  amountMinor: amount(amountMinor),
  count,
});

const NOTHING: KindTotals = {
  income: total(0, 0),
  spending: total(0, 0),
  moved: { out: total(0, 0), back: total(0, 0) },
};

// A quarter in pesos' minor units: salary and interest, spending, an
// investment and money back from Nequi.
const QUARTER_KINDS: KindTotals = {
  income: total(4_500_042_000, 93),
  spending: total(-2_440_000_000, 84),
  moved: { out: total(-2_980_000_000, 57), back: total(280_000_000, 8) },
};

describe("kindTiles", () => {
  it("shows each kind's compact total and count", () => {
    expect(kindTiles(QUARTER_KINDS)).toEqual([
      {
        tone: "income",
        label: "Ingresos",
        totals: ["+$45,0M"],
        detail: "93 movimientos",
      },
      {
        tone: "spending",
        label: "Gasto real",
        totals: ["−$24,4M"],
        detail: "84 movimientos",
      },
      {
        tone: "moved",
        label: "Movido",
        totals: ["−$29,8M", "+$2,8M"],
        detail: "57 salieron · 8 volvieron",
      },
    ]);
  });

  it("shows only the way money moved, and nothing when it didn't", () => {
    const outOnly = kindTiles({
      ...NOTHING,
      moved: { ...NOTHING.moved, out: total(-100_000, 1) },
    });
    const none = kindTiles(NOTHING);

    expect(outOnly[2]).toMatchObject({
      totals: ["−$1 mil"],
      detail: "1 salió",
    });
    expect(none[2]).toMatchObject({ totals: ["$0"], detail: "0 movimientos" });
    expect(none[0]).toMatchObject({ totals: ["$0"], detail: "0 movimientos" });
  });
});

describe("movementTone", () => {
  const item = (
    categoryId: CategoryId | null,
    isPendingReview = false,
  ): TransactionListItem => ({
    id: "m1",
    date: localDateSchema.parse("2026-09-30"),
    descriptionRaw: "TRANSFERENCIAS A NEQUI",
    amountMinor: amount(-90_000),
    balanceAfterMinor: null,
    categoryId,
    isPendingReview,
  });

  it.each([
    ["income", item("interest")],
    ["spending", item("transfers_to_people")],
    ["moved", item("credit_card_payment")],
    // Neither a guess nor a movement no rule knows shows a kind's color.
    ["neutral", item("own_account_transfer", true)],
    ["neutral", item(null)],
    ["neutral", item("digital_wallet" as CategoryId)],
  ] as const)("shows %s colors", (tone, movement) => {
    expect(movementTone(movement, true)).toBe(tone);
  });

  it("shows no kind's colors for a movement that counts nowhere", () => {
    expect(movementTone(item("interest"), false)).toBe("neutral");
  });
});

describe("selectionOf", () => {
  it("keeps a kind's categories, or what waits for review", () => {
    expect(selectionOf()).toEqual({});
    expect(selectionOf("review")).toEqual({ isPendingReview: true });
    expect(selectionOf("moved")).toEqual({
      categoryIds: [
        "own_account_transfer",
        "credit_card_payment",
        "investment",
      ],
    });
    expect(selectionOf("spending").categoryIds).toContain("other_spending");
  });
});

describe("filterOptions", () => {
  const QUARTER: MovementPeriod = { kind: "quarter", year: 2026, quarter: 3 };

  it("links each filter, keeping the period and the search, and counts what waits for review", () => {
    const options = filterOptions(
      { period: QUARTER, search: "nequi", filter: "moved" },
      24,
    );

    expect(options.map(({ label, isCurrent }) => [label, isCurrent])).toEqual([
      ["Todo", false],
      ["Ingresos", false],
      ["Gasto real", false],
      ["Movido", true],
      ["Por revisar · 24", false],
    ]);
    expect(options[0]?.href.query).toEqual({ period: "2026-q3", q: "nequi" });
    expect(options[4]?.href.query).toEqual({
      period: "2026-q3",
      q: "nequi",
      filter: "review",
    });
  });

  it("shows «Todo» as the current filter while none applies", () => {
    const options = filterOptions({ period: QUARTER }, 0);

    expect(
      options.filter(({ isCurrent }) => isCurrent).map(({ label }) => label),
    ).toEqual(["Todo"]);
    expect(options[0]?.href.query).toEqual({ period: "2026-q3" });
    expect(options[4]?.label).toBe("Por revisar · 0");
  });
});
