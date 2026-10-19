import {
  amountMinorSchema,
  type CategoryKind,
  sumAmounts,
} from "@xtrakto/core";
import { describe, expect, it } from "vitest";
import type { KindTotals } from "@/utils/kind-totals.helpers";
import { stakesView } from "./review-stakes.helpers";
import type { KindShare, ReviewGroup, ReviewGroupId } from "./review.types";

// Pesos, in minor units.
const pesos = (value: number) => amountMinorSchema.parse(value * 100);

// A quarter as v8-02 draws it: $46,8M of income and $24,4M of real
// spending, with the guesses as they stand.
const TOTALS: KindTotals = {
  income: { amountMinor: pesos(46_800_000), count: 40 },
  spending: { amountMinor: pesos(-24_400_000), count: 84 },
  moved: {
    out: { amountMinor: pesos(-29_800_000), count: 57 },
    back: { amountMinor: pesos(2_800_000), count: 8 },
  },
};

const share = (
  kind: CategoryKind,
  amount: number,
  count: number,
): KindShare => ({ kind, amountMinor: pesos(amount), count });

// A group whose movements wait, counting as these kinds meanwhile.
const open = (id: ReviewGroupId, ...kinds: KindShare[]): ReviewGroup => ({
  id,
  pending: {
    texts: [],
    amountMinor: sumAmounts(kinds.map(({ amountMinor }) => amountMinor)),
    count: kinds.reduce((sum, { count }) => sum + count, 0),
    kinds,
  },
  answered: null,
});

const closed = (id: ReviewGroupId, count: number): ReviewGroup => ({
  id,
  pending: null,
  answered: { texts: [], amountMinor: pesos(-count), count, outcomes: [] },
});

// v8-02: two groups answered, four waiting.
const REVIEW = {
  groups: [
    closed("own_name", 5),
    open("key_platforms", share("internal", -6_000_000, 4)),
    open("money_in", share("internal", 2_800_000, 5)),
    open("nequi_numbers", share("spending", -1_200_000, 13)),
    open("corresponsal", share("internal", 622_000, 2)),
    closed("pse_banks", 9),
  ],
  totals: TOTALS,
};

const explanationOf = (group: ReviewGroup) =>
  stakesView({ groups: [group], totals: TOTALS }).groups[0]?.explanation;

describe("stakesView", () => {
  it("counts the groups answered and the movements that wait", () => {
    expect(stakesView(REVIEW)).toMatchObject({
      subtitle: "Usamos nuestra mejor suposición mientras respondes.",
      progress: "2 de 6 respondidos",
      waiting: "24 movimientos pendientes",
      answeredPercent: 33,
    });
  });

  it("says what each open group counts as today and what its other answer would make the quarter's totals", () => {
    expect(stakesView(REVIEW).groups).toEqual([
      {
        id: "key_platforms",
        name: "Pagos con llave a plataformas",
        amount: "$6,0M",
        explanation:
          "Hoy cuentan como movido. Si son compras, tu gasto real sube a $30,4M.",
      },
      {
        id: "money_in",
        name: "Plata que entró",
        amount: "$2,8M",
        explanation:
          "Hoy cuentan como movido. Si es un ingreso, tus ingresos suben a $49,6M.",
      },
      {
        id: "nequi_numbers",
        name: "Números de Nequi",
        amount: "$1,2M",
        explanation:
          "Hoy cuentan como gasto real. Si son tuyos, tu gasto real baja a $23,2M.",
      },
      {
        id: "corresponsal",
        name: "Consignaciones en corresponsal",
        amount: "$622 mil",
        explanation:
          "Hoy cuentan como movido. Si es un ingreso, tus ingresos suben a $47,4M.",
      },
    ]);
  });

  it("says when an answer would take money out of the income", () => {
    expect(
      explanationOf(open("no_description_in", share("income", 500_000, 1))),
    ).toBe(
      "Hoy cuenta como ingreso. Si volvió de tus cuentas, tus ingresos bajan a $46,3M.",
    );
  });

  it("moves each kind the movements count as now, saying the one most of them count as", () => {
    expect(
      explanationOf(
        open(
          "key_platforms",
          share("internal", -3_000_000, 2),
          share("spending", -1_000_000, 1),
        ),
      ),
    ).toBe(
      "Hoy cuentan como movido. Si son compras, tu gasto real sube a $27,4M.",
    );
  });

  it("says only what a group counts as when its other answer changes no total", () => {
    // A guess an earlier table of rules gave: already what the answer gives.
    expect(
      explanationOf(open("key_people", share("internal", -500_000, 1))),
    ).toBe("Hoy cuenta como movido.");
  });

  it("weighs nothing once every group is answered", () => {
    expect(
      stakesView({
        groups: [closed("own_name", 5), closed("key_people", 1)],
        totals: TOTALS,
      }),
    ).toEqual({
      subtitle: "Respondiste todos los grupos de este trimestre.",
      progress: "2 de 2 respondidos",
      waiting: null,
      answeredPercent: 100,
      groups: [],
    });
  });

  it("counts one group and one movement in the singular", () => {
    expect(
      stakesView({
        groups: [open("key_people", share("spending", -50_000, 1))],
        totals: TOTALS,
      }),
    ).toMatchObject({
      progress: "0 de 1 respondido",
      waiting: "1 movimiento pendiente",
      answeredPercent: 0,
    });
  });
});
