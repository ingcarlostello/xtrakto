import { describe, expect, it } from "vitest";
import type { CategoryId } from "../categories/category.types";
import { amountMinorSchema } from "../money/money.schemas";
import { CATEGORIZATION_RULES } from "./categorization-rules.constants";
import { categorizeByRules } from "./categorization.helpers";
import type { CategorizationRuleId } from "./categorization.types";

// Invented descriptions in the bank's formats (ROADMAP Appendix B), with the
// synthetic fixtures' ones among them, and an amount that only sets which
// way the money goes.
const OUT = -9_000_000;
const IN = 9_000_000;
const REVIEW = "review";

type Match = readonly [
  description: string,
  amount: number,
  ruleId: CategorizationRuleId,
  categoryId: CategoryId,
  review?: typeof REVIEW,
];

const MATCHES: readonly Match[] = [
  ["0", OUT, "no_description_out", "other_spending", REVIEW],
  ["0", IN, "no_description_in", "other_income", REVIEW],
  ["ABONO INTERESES AHORROS", IN, "savings_interest", "interest"],
  ["INTERES INV VIRT *******0001", IN, "investment_interest", "interest"],
  ["APERTURA INV VIRTUAL SVP", OUT, "investment_opening", "investment"],
  ["IMPTO GOBIERNO 4X1000", OUT, "gmf_tax", "taxes_and_fees"],
  // A fee for a withdrawal, which isn't one itself.
  ["COMIS RETIRO CAJERO OTRA RED", OUT, "bank_fee", "taxes_and_fees"],
  ["AJUSTE INTERESES", OUT, "bank_fee", "taxes_and_fees"],
  ["PAGO SUC VIRT TC VISA PESOS", OUT, "card_payment", "credit_card_payment"],
  ["PAGO SUC VIRT TC MASTER PESOS", OUT, "card_payment", "credit_card_payment"],
  ["PAGO INTERBANC EMPRESA EJEMPLO", IN, "interbank_in", "income_transfer"],
  [
    "CONSIGNACION CORRESPONSAL CB",
    IN,
    "corresponsal_deposit",
    "own_account_transfer",
    REVIEW,
  ],
  ["RETIRO CAJERO  ATM PLAZA CENTR", OUT, "cash_withdrawal", "cash_withdrawal"],
  ["RETIRO CORRESPONSAL CB", OUT, "cash_withdrawal", "cash_withdrawal"],
  ["TRANSFERENCIAS A NEQUI", OUT, "nequi_out", "transfers_to_people"],
  ["Transferencias a Nequi", OUT, "nequi_out", "transfers_to_people"],
  ["TRANSFERENCIA DESDE NEQUI", IN, "nequi_in", "own_account_transfer", REVIEW],
  [
    "TRANSFERENCIA CTA SUC VIRTUAL",
    OUT,
    "virtual_branch_out",
    "transfers_to_people",
  ],
  ["TRANSFERENCIA CTA SUC VIRTUAL", IN, "virtual_branch_in", "income_transfer"],
  ["TRANSF QR JUAN PEREZ", OUT, "qr_transfer_out", "transfers_to_people"],
  ["TRANSF A EMPRESA DE GAS DE CO", OUT, "transfer_to_utility", "utilities"],
  ["TRANSF A PEDRO GOMEZ R", OUT, "transfer_out", "transfers_to_people"],
  // A name isn't a utility, even one that reads like a word for one.
  ["TRANSF A LUZ MARINA", OUT, "transfer_out", "transfers_to_people"],
  // The holder's own name stays a transfer until 6.2 compares it.
  ["TRANSF A Ana Maria Pru", OUT, "transfer_out", "transfers_to_people"],
  ["TRANSF A ANA MARIA PRUEB", OUT, "transfer_out", "transfers_to_people"],
  ["TRANSF DE ANA PRUEBA", IN, "transfer_in", "income_transfer"],
  ["TRANSF DE JUAN PEREZ", IN, "transfer_in", "income_transfer"],
  [
    "PAGO LLAVE INVERSIONES XY",
    OUT,
    "key_payment_saving",
    "investment",
    REVIEW,
  ],
  ["PAGO LLAVE AHORRO DOLAR", OUT, "key_payment_saving", "investment", REVIEW],
  ["PAGO LLAVE Maria Lopez", OUT, "key_payment", "transfers_to_people", REVIEW],
  ["PAGO LLAVE COMIDAS RÁ", OUT, "key_payment", "transfers_to_people", REVIEW],
  // A key payment stays to review even when a gateway takes it.
  ["PAGO LLAVE BOLD TIENDA", OUT, "key_payment", "transfers_to_people", REVIEW],
  ["COMPRA EN BOLD*CAFE", OUT, "payment_gateway", "payment_gateways"],
  ["COMPRA EN  EBANX*TIENDA", OUT, "payment_gateway", "payment_gateways"],
  ["PAGO PSE DLOCAL", OUT, "payment_gateway", "payment_gateways"],
  ["PAGO PSE EMPRESA DE ENERGIA", OUT, "utility_payment", "utilities"],
  ["PAGO PSE AIR-E S.A.S.", OUT, "utility_payment", "utilities"],
  ["COMPRA EN CLARO TIENDA", OUT, "utility_payment", "utilities"],
  ["PAGO PSE TRII", OUT, "pse_investment", "investment", REVIEW],
  ["PAGO PSE Banco Ejemplo S", OUT, "pse_card", "credit_card_payment", REVIEW],
  // Restored from a cell split at "ñí" (Appendix A.1); NU is a card first.
  [
    "PAGO PSE NU Compañía de Fina",
    OUT,
    "pse_card",
    "credit_card_payment",
    REVIEW,
  ],
  ["PAGO PSE RAPPIPAY", OUT, "pse_card", "credit_card_payment", REVIEW],
  ["PAGO PSE Financiera Andes S", OUT, "pse_loan", "loan_payment", REVIEW],
];

const NO_MATCHES: readonly (readonly [description: string, amount: number])[] =
  [
    // Purchases at stores no rule knows.
    ["COMPRA EN  MERCADO XYZ", OUT],
    ["COMPRA EN  TIENDA LA ESQUI", OUT],
    ["PAGO QR CAFE DEL PARQUE", OUT],
    ["PAGO QR TIENDA SIN CODIGO", OUT],
    // Words found only inside other words.
    ["COMPRA EN GASOLINERA", OUT],
    ["PAGO PSE FUNES", OUT],
    ["PAGO PSE MENU", OUT],
    ["PAGO PSE DAVIPLATA", OUT],
    // A text that only starts with the bank's 0.
    ["0 COMISION", OUT],
    // The other way round from what a rule expects.
    ["ABONO INTERESES AHORROS", OUT],
    ["TRANSF QR JUAN PEREZ", IN],
    ["PAGO INTERBANC EMPRESA EJEMPLO", OUT],
    ["TRANSF A PEDRO GOMEZ R", IN],
    ["PAGO LLAVE Maria Lopez", IN],
    // Money in through a gateway is the user's own sale.
    ["COMPRA EN BOLD*CAFE", IN],
    // Nothing moved, which is neither money in nor money out.
    ["TRANSFERENCIAS A NEQUI", 0],
    ["ABONO INTERESES AHORROS", 0],
  ];

const categorize = (description: string, amount: number) =>
  categorizeByRules({
    descriptionNormalized: description,
    amountMinor: amountMinorSchema.parse(amount),
  });

describe("categorizeByRules", () => {
  it.for(MATCHES)(
    "reads %j (%i) with %s",
    ([description, amount, ruleId, categoryId, review]) => {
      expect(categorize(description, amount)).toEqual({
        ruleId,
        categoryId,
        isPendingReview: review === REVIEW,
      });
    },
  );

  it.each(NO_MATCHES)("finds no rule for %j (%i)", (description, amount) => {
    expect(categorize(description, amount)).toBeNull();
  });

  it("has a case for every rule of the table", () => {
    const tested = new Set<string>(MATCHES.map(([, , ruleId]) => ruleId));
    const untested = CATEGORIZATION_RULES.map(({ id }) => id).filter(
      (id) => !tested.has(id),
    );

    expect(untested).toEqual([]);
  });
});
