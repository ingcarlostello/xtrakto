import {
  amountMinorSchema,
  type CategorizationRuleId,
  type CategoryId,
  localDateSchema,
  summarizeMovements,
  type UserCategoryRule,
} from "@xtrakto/core";
import type { PeriodMovement } from "@xtrakto/db";
import { describe, expect, it } from "vitest";
import type { MovementPeriod } from "@/utils/transactions-url.helpers";
import {
  gatewaysTile,
  movedView,
  ruleRows,
  spendingRows,
  spendingSubtitle,
} from "./categories.helpers";

const QUARTER: MovementPeriod = { kind: "quarter", year: 2026, quarter: 3 };
const AUGUST: MovementPeriod = { kind: "month", year: 2026, month: 8 };

type Row = readonly [
  amount: number,
  text: string,
  as: readonly [CategoryId, CategorizationRuleId],
];

const movement = ([amount, text, [categoryId, rule]]: Row) =>
  ({
    date: localDateSchema.parse("2026-08-15"),
    amountMinor: amountMinorSchema.parse(amount),
    balanceAfterMinor: null,
    descriptionRaw: text,
    referenceHash: null,
    referenceLast4: null,
    categoryId,
    categoryRuleId: rule,
  }) satisfies PeriodMovement;

// A period's movements as the page reads them, and what they add up to.
const categoriesOf = (rows: readonly Row[]) => {
  const movements = rows.map(movement);
  return { movements, summary: summarizeMovements(movements) };
};

const LOAN = ["loan_payment", "pse_loan"] as const;
const CASH = ["cash_withdrawal", "cash_withdrawal"] as const;
const NEQUI = ["transfers_to_people", "nequi_out"] as const;
const QR = ["transfers_to_people", "qr_transfer_out"] as const;
const GMF = ["taxes_and_fees", "gmf_tax"] as const;
const GATEWAY = ["payment_gateways", "payment_gateway"] as const;
const INVESTMENT = ["investment", "investment_opening"] as const;
const CARD = ["credit_card_payment", "card_payment"] as const;
const OWN_OUT = ["own_account_transfer", "own_name_out"] as const;
const OWN_IN = ["own_account_transfer", "nequi_in"] as const;

// v8-05's quarter, in short.
const ROWS: readonly Row[] = [
  [-462_000_000, "PAGO PSE Financiera Andes S", LOAN],
  [-200_000_000, "RETIRO CAJERO CENTRO", CASH],
  [-115_000_000, "RETIRO CORRESPONSAL TIENDA", CASH],
  [-100_000_000, "TRANSFERENCIAS A NEQUI", NEQUI],
  [-86_000_000, "TRANSF QR ANA PRUEBA", QR],
  [-1_976_000, "IMPTO GOBIERNO 4X1000", GMF],
  [-2_200_000_000, "APERTURA INV VIRTUAL", INVESTMENT],
  [-375_000_000, "PAGO SUC VIRT TC MASTER PESOS", CARD],
  [-405_000_000, "TRANSF A ANA PRUEBA LOPEZ", OWN_OUT],
  [280_000_000, "TRANSFERENCIA DESDE NEQUI", OWN_IN],
];

describe("spendingRows", () => {
  it("lists the real spending by category, the largest first, each with its bar, share, count and channels", () => {
    expect(spendingRows(categoriesOf(ROWS))).toEqual([
      {
        categoryId: "loan_payment",
        label: "Créditos",
        amount: "$4,6M",
        barPercent: 100,
        note: "48% de tu gasto real · 1 movimiento · PSE",
      },
      {
        categoryId: "cash_withdrawal",
        label: "Efectivo",
        amount: "$3,2M",
        barPercent: 68,
        note: "33% de tu gasto real · 2 movimientos · Cajero y corresponsal",
      },
      {
        categoryId: "transfers_to_people",
        label: "Pagos a personas",
        amount: "$1,9M",
        barPercent: 40,
        note: "19% de tu gasto real · 2 movimientos · QR y Nequi",
      },
      {
        categoryId: "taxes_and_fees",
        label: "Costos del banco",
        amount: "$19.760",
        barPercent: 1,
        note: "menos del 1% de tu gasto real · 1 movimiento",
      },
    ]);
  });

  it("lists nothing without real spending", () => {
    expect(spendingRows(categoriesOf(ROWS.slice(6)))).toEqual([]);
  });
});

describe("spendingSubtitle", () => {
  it.each([
    {
      period: QUARTER,
      rows: ROWS,
      text: "$9,6M en el trimestre, de mayor a menor.",
    },
    { period: AUGUST, rows: ROWS, text: "$9,6M en agosto, de mayor a menor." },
    {
      period: QUARTER,
      rows: ROWS.slice(6),
      text: "No hubo gasto real en este periodo.",
    },
  ])("says $text", ({ period, rows, text }) => {
    expect(spendingSubtitle(period, categoriesOf(rows).summary)).toBe(text);
  });
});

describe("movedView", () => {
  it("lists where money moved, the most first with its bar, then what came back", () => {
    expect(movedView(categoriesOf(ROWS).summary)).toEqual({
      subtitle: "Salieron $29,8M y volvieron $2,8M. Todo sigue siendo tuyo.",
      rows: [
        {
          key: "investment",
          categoryId: "investment",
          label: "A tu inversión",
          amount: "−$22,0M",
          barPercent: 100,
        },
        {
          key: "own_account_transfer",
          categoryId: "own_account_transfer",
          label: "A tus cuentas",
          amount: "−$4,1M",
          barPercent: 18,
        },
        {
          key: "credit_card_payment",
          categoryId: "credit_card_payment",
          label: "Pago de tarjetas",
          amount: "−$3,8M",
          barPercent: 17,
        },
        {
          key: "back",
          categoryId: "own_account_transfer",
          label: "Volvió de tus cuentas",
          amount: "+$2,8M",
          note: "Plata tuya que regresó: no es ingreso.",
        },
      ],
    });
  });

  it.each([
    {
      rows: ROWS.slice(6, 9),
      text: "Salieron $29,8M. Todo sigue siendo tuyo.",
    },
    { rows: ROWS.slice(9), text: "Volvieron $2,8M. Todo sigue siendo tuyo." },
    {
      rows: ROWS.slice(0, 6),
      text: "No moviste plata entre tus cuentas, tu inversión ni tus tarjetas.",
    },
  ])("says $text", ({ rows, text }) => {
    expect(movedView(categoriesOf(rows).summary).subtitle).toBe(text);
  });

  it("lists only what came back when nothing went out", () => {
    expect(
      movedView(categoriesOf(ROWS.slice(9)).summary).rows.map(({ key }) => key),
    ).toEqual(["back"]);
  });
});

describe("gatewaysTile", () => {
  it("asks to name the payments through a gateway, in their insight's words", () => {
    expect(
      gatewaysTile(
        categoriesOf([
          [-30_000_000, "COMPRA EN BOLD*CAFE", GATEWAY],
          [-30_000_000, "COMPRA EN BOLD*CAFE", GATEWAY],
        ]).movements,
      ),
    ).toEqual({
      categoryId: "payment_gateways",
      title: "2 pagos sin tienda identificada",
      amount: "$600.000",
      note: "Pasaron por pasarelas de pago y el banco no dice dónde compraste: elige su categoría en Movimientos.",
      needsAttention: true,
    });
  });

  it("shows none without them", () => {
    expect(gatewaysTile(categoriesOf(ROWS).movements)).toBeUndefined();
  });
});

describe("ruleRows", () => {
  const RULES: readonly UserCategoryRule[] = [
    {
      target: "reference",
      referenceHash: "h1",
      referenceLast4: "1270",
      categoryId: "own_account_transfer",
    },
    {
      target: "description",
      descriptionFolded: "PAGO LLAVE INVERSIONES XY",
      direction: "out",
      categoryId: "investment",
    },
    {
      target: "description",
      descriptionFolded: "TRANSF A ANA LUCIA MAR",
      direction: "out",
      categoryId: "own_account_transfer",
    },
    {
      target: "description",
      descriptionFolded: "CONSIGNACION CORRESPONSAL",
      direction: "in",
      categoryId: "deposit",
    },
  ];

  it("says what each rule holds for and what it says, the texts first and then the numbers", () => {
    expect(ruleRows(RULES)).toEqual([
      {
        key: "CONSIGNACION CORRESPONSAL-in",
        text: "CONSIGNACION CORRESPONSAL",
        meaning: "Si entra: Consignaciones · ingreso",
      },
      {
        key: "PAGO LLAVE INVERSIONES XY-out",
        text: "PAGO LLAVE INVERSIONES XY",
        meaning: "Si sale: Inversiones · movido",
      },
      {
        key: "TRANSF A ANA LUCIA MAR-out",
        text: "TRANSF A ANA LUCIA MAR",
        meaning: "Si sale: Entre tus cuentas · movido",
      },
      {
        key: "h1",
        text: "ref ••• 1270",
        meaning: "Entre tus cuentas · movido",
      },
    ]);
  });
});
