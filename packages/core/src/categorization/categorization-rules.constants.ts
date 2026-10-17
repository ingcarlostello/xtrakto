import {
  BANK_WORDS,
  GATEWAY_WORDS,
  LOAN_WORDS,
  SAVINGS_WORDS,
  UTILITY_WORDS,
} from "./categorization-words.constants";
import { MONEY_DIRECTION } from "./categorization.constants";
import type { CategorizationRule } from "./categorization.types";

const { IN, OUT } = MONEY_DIRECTION;

// Payments whose next words name who was paid.
const PAYMENT_PREFIXES = ["PAGO PSE", "COMPRA EN", "PAGO QR"];

/**
 * Bancolombia's descriptions (ROADMAP Appendix B) and the category each one
 * gives. The first rule a movement matches wins, so a specific text comes
 * before a general one.
 */
export const CATEGORIZATION_RULES = [
  {
    id: "no_description_out",
    is: "0",
    direction: OUT,
    categoryId: "other_spending",
    isGuess: true,
    reasonEs: "el banco no escribió qué fue este movimiento",
  },
  {
    id: "no_description_in",
    is: "0",
    direction: IN,
    categoryId: "other_income",
    isGuess: true,
    reasonEs: "el banco no escribió qué fue este movimiento",
  },
  // Texts the bank always writes the same way.
  {
    id: "savings_interest",
    startsWith: ["ABONO INTERESES AHORROS"],
    direction: IN,
    categoryId: "interest",
    reasonEs:
      "el banco te paga intereses cada día por la plata de tu cuenta de ahorros",
  },
  {
    id: "investment_interest",
    startsWith: ["INTERES INV VIRT"],
    direction: IN,
    categoryId: "interest",
    reasonEs: "son los intereses de tu inversión virtual",
  },
  {
    id: "investment_opening",
    startsWith: ["APERTURA INV VIRTUAL"],
    direction: OUT,
    categoryId: "investment",
    reasonEs: "abriste una inversión virtual: la plata sigue siendo tuya",
  },
  {
    id: "gmf_tax",
    words: ["4X1000"],
    direction: OUT,
    categoryId: "taxes_and_fees",
    reasonEs: "el 4x1000 es el impuesto a los movimientos financieros",
  },
  {
    id: "bank_fee",
    // A fee, such as the one for a withdrawal at another bank's ATM
    // ("COMIS RETIRO CAJERO …"), or an adjustment.
    startsWith: ["COMIS", "AJUSTE"],
    direction: OUT,
    categoryId: "taxes_and_fees",
    reasonEs: "el banco cobró una comisión o hizo un ajuste",
  },
  {
    id: "card_payment",
    startsWith: ["PAGO SUC VIRT TC"],
    direction: OUT,
    categoryId: "credit_card_payment",
    reasonEs:
      "pagaste una tarjeta de crédito: sus compras están en el extracto de la tarjeta",
  },
  {
    id: "interbank_in",
    startsWith: ["PAGO INTERBANC"],
    direction: IN,
    categoryId: "income_transfer",
    reasonEs: "te llegó plata desde otro banco",
  },
  {
    id: "corresponsal_deposit",
    startsWith: ["CONSIGNACION CORRESPONSAL"],
    direction: IN,
    categoryId: "own_account_transfer",
    isGuess: true,
    reasonEs:
      "una consignación en corresponsal suele ser tu propio efectivo, aunque puede ser un pago que te hicieron",
  },
  {
    id: "cash_withdrawal",
    startsWith: ["RETIRO CAJERO", "RETIRO CORRESPONSAL"],
    direction: OUT,
    categoryId: "cash_withdrawal",
    reasonEs: "sacaste efectivo: no sabemos en qué se usó",
  },
  // Transfers.
  {
    id: "nequi_out",
    startsWith: ["TRANSFERENCIAS A NEQUI"],
    direction: OUT,
    categoryId: "transfers_to_people",
    reasonEs:
      "un envío a Nequi es un pago a una persona, salvo que el número sea tuyo",
  },
  {
    id: "nequi_in",
    startsWith: ["TRANSFERENCIA DESDE NEQUI"],
    direction: IN,
    categoryId: "own_account_transfer",
    isGuess: true,
    reasonEs:
      "la plata que llega de un Nequi suele ser tuya; si es de otra persona, es un ingreso",
  },
  {
    id: "virtual_branch_out",
    startsWith: ["TRANSFERENCIA CTA SUC VIRTUAL"],
    direction: OUT,
    categoryId: "transfers_to_people",
    reasonEs: "una transferencia a otra cuenta suele ser un pago a una persona",
  },
  {
    id: "virtual_branch_in",
    startsWith: ["TRANSFERENCIA CTA SUC VIRTUAL"],
    direction: IN,
    categoryId: "income_transfer",
    reasonEs: "te transfirieron plata desde otra cuenta",
  },
  {
    id: "qr_transfer_out",
    startsWith: ["TRANSF QR"],
    direction: OUT,
    categoryId: "transfers_to_people",
    reasonEs: "una transferencia por QR suele ser un pago a una persona",
  },
  {
    id: "transfer_to_utility",
    startsWith: ["TRANSF A"],
    words: UTILITY_WORDS,
    direction: OUT,
    categoryId: "utilities",
    reasonEs:
      "algunas empresas de servicios del hogar reciben su pago como transferencia",
  },
  {
    id: "transfer_out",
    startsWith: ["TRANSF A"],
    direction: OUT,
    categoryId: "transfers_to_people",
    reasonEs: "las transferencias a otras personas son pagos a personas",
  },
  {
    id: "transfer_in",
    startsWith: ["TRANSF DE"],
    direction: IN,
    categoryId: "income_transfer",
    reasonEs: "te transfirieron plata desde otra cuenta",
  },
  // Bre-B key payments go to people, stores or the user's own savings.
  {
    id: "key_payment_saving",
    startsWith: ["PAGO LLAVE"],
    words: SAVINGS_WORDS,
    direction: OUT,
    categoryId: "investment",
    isGuess: true,
    reasonEs: "creemos que es tu inversión o tu ahorro",
  },
  {
    id: "key_payment",
    startsWith: ["PAGO LLAVE"],
    direction: OUT,
    categoryId: "transfers_to_people",
    isGuess: true,
    reasonEs:
      "un pago con llave puede ir a una persona, a una tienda o a tu propio ahorro",
  },
  // Who was paid, after the key payments so that those stay to review.
  {
    id: "payment_gateway",
    words: GATEWAY_WORDS,
    direction: OUT,
    categoryId: "payment_gateways",
    reasonEs:
      "las pasarelas de pago cobran por otras tiendas y el banco no dice cuál",
  },
  {
    id: "utility_payment",
    startsWith: PAYMENT_PREFIXES,
    words: UTILITY_WORDS,
    direction: OUT,
    categoryId: "utilities",
    reasonEs:
      "los pagos de luz, agua, gas, internet o celular son servicios del hogar",
  },
  {
    id: "pse_investment",
    startsWith: ["PAGO PSE"],
    words: SAVINGS_WORDS,
    direction: OUT,
    categoryId: "investment",
    isGuess: true,
    reasonEs: "creemos que es tu inversión o tu ahorro",
  },
  {
    id: "pse_card",
    startsWith: ["PAGO PSE"],
    words: BANK_WORDS,
    direction: OUT,
    categoryId: "credit_card_payment",
    isGuess: true,
    reasonEs:
      "un pago PSE a un banco o a una fintech suele ser el pago de una tarjeta",
  },
  {
    id: "pse_loan",
    startsWith: ["PAGO PSE"],
    words: LOAN_WORDS,
    direction: OUT,
    categoryId: "loan_payment",
    isGuess: true,
    reasonEs: "creemos que es la cuota de un crédito",
  },
] as const satisfies readonly CategorizationRule[];
