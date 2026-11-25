import { describe, expect, it } from "vitest";
import type { ExtractedContent, SpreadsheetCell } from "@xtrakto/core";
import cardBasic from "../../fixtures/card-basic.json";
import cardBroken from "../../fixtures/card-broken.json";
import cardDollars from "../../fixtures/card-dollars.json";
import { fixtureContent } from "../../fixtures/fixture.utils";
import mappedOutIn from "../../fixtures/mapped-out-in.json";
import movementsBasic from "../../fixtures/movements-basic.json";
import movementsBasicPdf from "../../fixtures/movements-basic-pdf.json";
import quarterlyBasic from "../../fixtures/quarterly-basic.json";
import quarterlyBasicPdf from "../../fixtures/quarterly-basic-pdf.json";
import { RECONCILIATION_ISSUE } from "../reconciliation/reconciliation.constants";
import { reconcile } from "../reconciliation/reconciliation.helpers";
import { bancolombiaCardParser } from "./card-parser.helpers";

type Rows = SpreadsheetCell[][];

const BASIC = fixtureContent(cardBasic);

const parsed = (content: ExtractedContent) => {
  const statement = bancolombiaCardParser.parse(content);
  if (!statement.ok) throw new Error(JSON.stringify(statement.error));
  return statement.value;
};

// The basic card statement with its sheet in pesos changed.
const withPesos = (edit: (rows: Rows) => Rows): ExtractedContent => {
  if (BASIC.type !== "spreadsheet") throw new Error("Not a spreadsheet");
  const [pesos, ...others] = BASIC.sheets;
  if (pesos === undefined) throw new Error("No sheet in pesos");
  const rows = pesos.rows.map((row) => [...row]);
  return { ...BASIC, sheets: [{ ...pesos, rows: edit(rows) }, ...others] };
};

// The row whose first cell is a label, changed.
const withRow =
  (label: string, row: SpreadsheetCell[]) =>
  (rows: Rows): Rows =>
    rows.map((cells) => (cells[0] === label ? row : cells));

// A movement as the parser gives it: its date, text and amount in Xtrakto's
// signs, its row, and its installment as [number, count, monthly, rate,
// remaining].
const movement = (
  [date, text, amountMinor]: readonly [string, string, number],
  sourceRow: number,
  installment?: readonly [number, number, number, number, number],
) => ({
  date,
  descriptionRaw: text,
  descriptionNormalized: text,
  amountMinor,
  ...(installment === undefined
    ? {}
    : {
        installment: {
          number: installment[0],
          count: installment[1],
          monthlyMinor: installment[2],
          monthlyRatePpm: installment[3],
          remainingMinor: installment[4],
        },
      }),
  sourceRow,
});

const failureOf = (content: ExtractedContent) => {
  const statement = bancolombiaCardParser.parse(content);
  return statement.ok ? undefined : statement.error.details;
};

describe("bancolombiaCardParser", () => {
  it("reads the holder, the card, the period, what's due and both summaries", () => {
    expect(parsed(BASIC)).toMatchObject({
      bankId: "bancolombia",
      formatId: "bancolombia-credit-card",
      accountType: "credit_card",
      accountLast4: "1234",
      currency: "COP",
      period: { from: "2026-08-31", to: "2026-09-30" },
      periodSource: "statement",
      holderName: "ANA MARIA PRUEBA GOMEZ",
      card: {
        creditLimitMinor: 500_000_000,
        availableMinor: 171_549_970,
        minimumPaymentMinor: 57_450_100,
        totalPaymentMinor: 328_450_100,
        dueDate: "2026-10-15",
        summary: {
          kind: "bancolombia",
          total: {
            previousBalanceMinor: 330_000_000,
            purchasesMinor: 20_540_000,
            lateInterestMinor: 120_000,
            interestMinor: 4_500_030,
            advancesMinor: 20_000_000,
            otherChargesMinor: 3_290_000,
            chargesMinor: 378_450_030,
            paymentsMinor: 50_000_000,
            creditInFavorMinor: 0,
          },
          minimum: {
            installmentsMinor: 9_540_000,
            earlierInstallmentsMinor: 20_000_000,
            advanceInstallmentsMinor: 20_000_000,
            lateInterestMinor: 120_000,
            interestMinor: 4_500_030,
            otherChargesMinor: 3_290_000,
            overdueMinor: 0,
            inFavorMinor: 0,
          },
        },
      },
      warnings: [],
    });
  });

  it("reads both tables' movements in Xtrakto's signs, each purchase with its installment", () => {
    expect(parsed(BASIC).transactions).toEqual([
      movement(["2026-09-30", "INTERESES DE MORA", -120_000], 31),
      movement(["2026-09-30", "INTERESES CORRIENTES", -4_500_030], 32),
      movement(["2026-09-30", "CUOTA DE MANEJO", -3_290_000], 33),
      movement(["2026-09-15", "ABONO SUCURSAL VIRTUAL", 50_000_000], 34),
      movement(
        ["2026-09-10", "AVANCE CAJERO CENTRO", -20_000_000],
        35,
        [1, 1, 20_000_000, 19_000, 0],
      ),
      movement(
        ["2026-09-08", "SUPERMERCADO EL ARCO", -8_540_000],
        36,
        [1, 1, 8_540_000, 0, 0],
      ),
      // Its long number masked (ADR 0012).
      movement(
        ["2026-09-03", "TIENDA EJEMPLO *****6789", -12_000_000],
        37,
        [1, 12, 1_000_000, 19_000, 11_000_000],
      ),
      movement(
        ["2026-07-20", "ALMACEN HOGAR", -60_000_000],
        41,
        [3, 6, 10_000_000, 19_000, 30_000_000],
      ),
      movement(
        ["2026-03-10", "COMPRA DE CARTERA Y/O D", -300_000_000],
        42,
        [7, 30, 10_000_000, 11_500, 230_000_000],
      ),
    ]);
  });

  it("reconciles a month whose sums hold, and finds a payment misread", () => {
    expect(reconcile(parsed(BASIC))).toEqual({
      balanceVerified: true,
      issues: [],
      closingDifferenceMinor: 0,
    });
    expect(reconcile(parsed(fixtureContent(cardBroken)))).toEqual({
      balanceVerified: false,
      issues: [{ code: RECONCILIATION_ISSUE.CARD_MOVEMENTS }],
      closingDifferenceMinor: 1_000_000,
    });
  });

  it("counts the movements in dollars as warnings, and reads the pesos as before", () => {
    const statement = parsed(fixtureContent(cardDollars));

    expect(statement.warnings).toEqual([
      { code: "FOREIGN_CURRENCY" },
      { code: "FOREIGN_CURRENCY" },
    ]);
    expect(statement.transactions).toEqual(parsed(BASIC).transactions);
    expect(reconcile(statement).balanceVerified).toBe(true);
  });

  it("finds its sheets by their currency, whatever their order", () => {
    if (BASIC.type !== "spreadsheet") throw new Error("Not a spreadsheet");
    const swapped = { ...BASIC, sheets: BASIC.sheets.toReversed() };

    expect(parsed(swapped)).toEqual(parsed(BASIC));
  });

  it("reads nothing due when the date is a dash, and a period across New Year", () => {
    const content = withPesos((rows) =>
      withRow("Periodo facturado: ", [
        "Periodo facturado: ",
        "16 dic",
        "15 ene. 2027",
      ])(withRow("Pagar antes de: ", ["Pagar antes de: ", "-"])(rows)),
    );
    const statement = bancolombiaCardParser.parse(content);

    expect(statement).toMatchObject({
      ok: true,
      value: { period: { from: "2026-12-16", to: "2027-01-15" } },
    });
    expect(statement.ok && statement.value.card).not.toHaveProperty("dueDate");
  });

  it("warns of a row in a table that isn't a movement", () => {
    const content = withPesos((rows) =>
      rows.map((row, index) =>
        index === 32 ? [null, "TOTAL", "INTERESES"] : row,
      ),
    );

    expect(parsed(content).warnings).toEqual([
      { code: "UNEXPECTED_ROW", sourceRow: 32 },
    ]);
  });

  it.each([
    [
      "a sheet in pesos",
      withPesos(withRow("Moneda: ", ["Moneda: ", "EUROS"])),
      { reason: "missing_block", block: "Moneda:" },
    ],
    [
      "the card's number",
      withPesos(
        withRow("Información de la Tarjeta", [
          "Información de la Tarjeta",
          "1234 5678",
        ]),
      ),
      { reason: "invalid_value", block: "Información de la Tarjeta" },
    ],
    [
      "a minimum that reads",
      withPesos(withRow("Pago mínimo", ["Pago mínimo", "mucho"])),
      { reason: "invalid_value", column: "Pago mínimo" },
    ],
    [
      "the summaries' header",
      withPesos((rows) =>
        rows.map((row) =>
          row[0] === "Tasas de interés vigente" ? ["Tasas"] : row,
        ),
      ),
      { reason: "missing_block", block: "Resumen Saldo Total" },
    ],
    [
      "a summary's line",
      withPesos((rows) =>
        rows.map((row) => (row[3] === "Cargos" ? row.with(3, "Total") : row)),
      ),
      {
        reason: "missing_value",
        block: "Resumen Saldo Total",
        column: "Cargos",
      },
    ],
    [
      "a movements header with its columns",
      withPesos((rows) =>
        rows.map((row, index) => (index === 30 ? row.with(6, "Tasa") : row)),
      ),
      {
        reason: "missing_column",
        block: "Movimientos durante el periodo",
        column: "Interés mensual (%)",
      },
    ],
    [
      "an installment within its count",
      withPesos((rows) =>
        rows.map((row, index) => (index === 37 ? row.with(4, "13/12") : row)),
      ),
      { reason: "invalid_value", column: "Número de cuotas", row: 37 },
    ],
    [
      "a movement's date",
      withPesos((rows) =>
        rows.map((row, index) =>
          index === 34 ? row.with(1, "31/02/2026") : row,
        ),
      ),
      { reason: "invalid_value", column: "Fecha", row: 34 },
    ],
  ])("fails without %s, naming where", (_, content, failure) => {
    expect(failureOf(content)).toMatchObject(failure);
  });

  it("fails on a PDF's content", () => {
    expect(failureOf(fixtureContent(quarterlyBasicPdf))).toEqual({
      reason: "content_type",
    });
  });

  it("recognizes only card statements", () => {
    const others = [
      quarterlyBasic,
      quarterlyBasicPdf,
      movementsBasic,
      movementsBasicPdf,
      mappedOutIn,
    ].map(fixtureContent);
    const cards = [cardBasic, cardDollars, cardBroken].map(fixtureContent);

    expect(others.some(bancolombiaCardParser.canParse)).toBe(false);
    expect(cards.every(bancolombiaCardParser.canParse)).toBe(true);
  });
});
