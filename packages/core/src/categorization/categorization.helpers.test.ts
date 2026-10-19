import { describe, expect, it } from "vitest";
import type { CategoryId } from "../categories/category.types";
import { amountMinorSchema } from "../money/money.schemas";
import type { ReferenceKind } from "../statements/statement.types";
import { CATEGORIZATION_RULES } from "./categorization-rules.constants";
import { categorizeByRules } from "./categorization.helpers";
import type { CategorizationRuleId } from "./categorization.types";

// Invented descriptions in the bank's formats (ROADMAP Appendix B), with the
// synthetic fixtures' ones among them, and an amount that only sets which
// way the money goes.
const OUT = -9_000_000;
const IN = 9_000_000;
const REVIEW = "review";
// The fixtures' holder, as `normalizeHolderName` writes the quarterly
// statement's: the context every case below runs with.
const HOLDER = "ANA MARIA PRUEBA GOMEZ";

type Match = readonly [
  description: string,
  amount: number,
  ruleId: CategorizationRuleId,
  categoryId: CategoryId,
  review?: typeof REVIEW,
  reference?: ReferenceKind,
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
  // A Nequi send asks whether its number is the user's, when it has one.
  [
    "TRANSFERENCIAS A NEQUI",
    OUT,
    "nequi_out_number",
    "transfers_to_people",
    REVIEW,
    "phone",
  ],
  ["TRANSFERENCIAS A NEQUI", OUT, "nequi_out", "transfers_to_people"],
  ["Transferencias a Nequi", OUT, "nequi_out", "transfers_to_people"],
  [
    "TRANSFERENCIAS A NEQUI",
    OUT,
    "nequi_out",
    "transfers_to_people",
    undefined,
    "code",
  ],
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
  // The holder's own name: moved, and to review when the bank cut it.
  ["TRANSF A ANA PRUEBA GOMEZ", OUT, "own_name_out", "own_account_transfer"],
  [
    "TRANSF A Ana Maria Pru",
    OUT,
    "own_name_out_cut",
    "own_account_transfer",
    REVIEW,
  ],
  [
    "TRANSF A ANA MARIA PRUEB",
    OUT,
    "own_name_out_cut",
    "own_account_transfer",
    REVIEW,
  ],
  ["TRANSF DE ANA PRUEBA", IN, "own_name_in", "own_account_transfer"],
  [
    "TRANSF DE ANA MARIA PRU",
    IN,
    "own_name_in_cut",
    "own_account_transfer",
    REVIEW,
  ],
  // Cut before any surname, as the bank often writes the holder's name.
  [
    "TRANSF A ANA MARI",
    OUT,
    "own_name_out_cut",
    "own_account_transfer",
    REVIEW,
  ],
  // Too little of the name, or someone else's, is another person.
  ["TRANSF A ANA", OUT, "transfer_out", "transfers_to_people"],
  ["TRANSF A ANA MA", OUT, "transfer_out", "transfers_to_people"],
  ["TRANSF A ANA LOPEZ", OUT, "transfer_out", "transfers_to_people"],
  ["TRANSF A JUAN PRUEBA GOMEZ", OUT, "transfer_out", "transfers_to_people"],
  ["TRANSF DE JUAN PEREZ", IN, "transfer_in", "income_transfer"],
  [
    "PAGO LLAVE INVERSIONES XY",
    OUT,
    "key_payment_saving",
    "investment",
    REVIEW,
  ],
  ["PAGO LLAVE AHORRO DOLAR", OUT, "key_payment_saving", "investment", REVIEW],
  [
    "PAGO LLAVE ANA PRUEBA",
    OUT,
    "own_name_key",
    "own_account_transfer",
    REVIEW,
  ],
  [
    "PAGO LLAVE ANA MARIA PRUEB",
    OUT,
    "own_name_key_cut",
    "own_account_transfer",
    REVIEW,
  ],
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
  // Merchants, after every other rule.
  ["COMPRA EN NETFLIX.COM", OUT, "merchant_subscriptions", "subscriptions"],
  ["COMPRA EN AMAZON PRIME", OUT, "merchant_subscriptions", "subscriptions"],
  ["PAGO QR CAFE DEL PARQUE", OUT, "merchant_restaurants", "restaurants"],
  ["COMPRA EN UBER EATS", OUT, "merchant_restaurants", "restaurants"],
  ["COMPRA EN RAPPI", OUT, "merchant_restaurants", "restaurants"],
  ["COMPRA EN MCDONALD'S", OUT, "merchant_restaurants", "restaurants"],
  // Cut by the bank, as a stem allows.
  ["COMPRA EN JUAN VALDE", OUT, "merchant_restaurants", "restaurants"],
  ["COMPRA EN UBER TRIP", OUT, "merchant_transport", "transport"],
  ["COMPRA EN GASOLINERA", OUT, "merchant_transport", "transport"],
  ["COMPRA EN AMAZON MKTPL", OUT, "merchant_shopping", "shopping"],
  ["COMPRA EN MERCADO LIBRE", OUT, "merchant_shopping", "shopping"],
  ["COMPRA EN  MERCADO XYZ", OUT, "merchant_groceries", "groceries"],
  ["COMPRA EN SUPERMERCADO LA", OUT, "merchant_groceries", "groceries"],
  ["COMPRA EN DROGAS LA REBAJA", OUT, "merchant_health", "health"],
  ["PAGO PSE CONJUNTO RESIDENCIAL", OUT, "merchant_housing", "housing"],
  ["COMPRA EN CINE COLOMBIA", OUT, "merchant_entertainment", "entertainment"],
  ["PAGO PSE UNIVERSIDAD EJEMPLO", OUT, "merchant_education", "education"],
  // Merchant words count only after a purchase or a payment.
  ["TRANSF A EXITO PEREZ", OUT, "transfer_out", "transfers_to_people"],
  // Any other purchase or payment is still spending, as "Otros".
  ["COMPRA EN  TIENDA LA ESQUI", OUT, "unknown_merchant", "other_spending"],
  ["PAGO QR TIENDA SIN CODIGO", OUT, "unknown_merchant", "other_spending"],
  // METRO is a supermarket and a train.
  ["COMPRA EN METRO CENTRO", OUT, "unknown_merchant", "other_spending"],
  // Words found only inside other words.
  ["COMPRA EN PARA TODOS", OUT, "unknown_merchant", "other_spending"],
  ["PAGO PSE FUNES", OUT, "unknown_merchant", "other_spending"],
  ["PAGO PSE MENU", OUT, "unknown_merchant", "other_spending"],
  ["PAGO PSE DAVIPLATA", OUT, "unknown_merchant", "other_spending"],
];

const NO_MATCHES: readonly (readonly [description: string, amount: number])[] =
  [
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
    // A purchase that comes back is a refund, which no rule reads yet.
    ["COMPRA EN NETFLIX.COM", IN],
    // Nothing moved, which is neither money in nor money out.
    ["TRANSFERENCIAS A NEQUI", 0],
    ["ABONO INTERESES AHORROS", 0],
  ];

const movement = (
  description: string,
  amount: number,
  referenceKind?: ReferenceKind,
) => ({
  descriptionNormalized: description,
  amountMinor: amountMinorSchema.parse(amount),
  referenceKind,
});

const categorize = (
  description: string,
  amount: number,
  referenceKind?: ReferenceKind,
) =>
  categorizeByRules(movement(description, amount, referenceKind), {
    holderName: HOLDER,
  });

describe("categorizeByRules", () => {
  it.for(MATCHES)(
    "reads %j (%i) with %s",
    ([description, amount, ruleId, categoryId, review, reference]) => {
      expect(categorize(description, amount, reference)).toEqual({
        ruleId,
        categoryId,
        isPendingReview: review === REVIEW,
      });
    },
  );

  it.each(NO_MATCHES)("finds no rule for %j (%i)", (description, amount) => {
    expect(categorize(description, amount)).toBeNull();
  });

  // An export saved before any quarterly statement printed the holder's name.
  it.each([
    ["TRANSF A ANA MARIA PRUEB", OUT, "transfer_out"],
    ["TRANSF DE ANA PRUEBA", IN, "transfer_in"],
    ["PAGO LLAVE ANA PRUEBA", OUT, "key_payment"],
  ])(
    "reads %j (%i) as %s without the holder's name",
    (description, amount, ruleId) => {
      expect(categorizeByRules(movement(description, amount))?.ruleId).toBe(
        ruleId,
      );
    },
  );

  it("has a case for every rule of the table", () => {
    const tested = new Set<string>(MATCHES.map(([, , ruleId]) => ruleId));
    const untested = CATEGORIZATION_RULES.map(({ id }) => id).filter(
      (id) => !tested.has(id),
    );

    expect(untested).toEqual([]);
  });
});
