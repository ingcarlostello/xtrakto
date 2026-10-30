import {
  BANK_WORDS,
  GATEWAY_WORDS,
  LOAN_WORDS,
  PAYMENT_PREFIXES,
  SAVINGS_WORDS,
  UTILITY_WORDS,
} from "./categorization-words.constants";
import { REFERENCE_KIND } from "../statements/statement.constants";
import { MONEY_DIRECTION, NO_DESCRIPTION } from "./categorization.constants";
import { MERCHANT_RULES } from "./merchant-rules.constants";
import type { CategorizationRule } from "./categorization.types";

const { IN, OUT } = MONEY_DIRECTION;

/**
 * Bancolombia's descriptions (ROADMAP Appendix B) and the category each one
 * gives. The first rule a movement matches wins, so a specific text comes
 * before a general one.
 */
export const CATEGORIZATION_RULES = [
  {
    id: "no_description_out",
    is: NO_DESCRIPTION,
    direction: OUT,
    categoryId: "other_spending",
    titleEs: "Sin descripción del banco",
    isGuess: true,
    reasonEs: "el banco no escribió qué fue este movimiento",
  },
  {
    id: "no_description_in",
    is: NO_DESCRIPTION,
    direction: IN,
    categoryId: "other_income",
    titleEs: "Sin descripción del banco",
    isGuess: true,
    reasonEs: "el banco no escribió qué fue este movimiento",
  },
  // Texts the bank always writes the same way.
  {
    id: "savings_interest",
    startsWith: ["ABONO INTERESES AHORROS"],
    direction: IN,
    categoryId: "interest",
    titleEs: "Intereses de tus ahorros",
    reasonEs:
      "el banco te paga intereses cada día por la plata de tu cuenta de ahorros",
  },
  {
    id: "investment_interest",
    startsWith: ["INTERES INV VIRT"],
    direction: IN,
    categoryId: "interest",
    titleEs: "Intereses de tu inversión",
    reasonEs: "son los intereses de tu inversión virtual",
  },
  {
    id: "investment_opening",
    startsWith: ["APERTURA INV VIRTUAL"],
    direction: OUT,
    categoryId: "investment",
    titleEs: "Abriste una inversión",
    reasonEs: "abriste una inversión virtual: la plata sigue siendo tuya",
  },
  {
    id: "gmf_tax",
    words: ["4X1000"],
    direction: OUT,
    categoryId: "taxes_and_fees",
    titleEs: "Impuesto del 4x1000",
    reasonEs: "el 4x1000 es el impuesto a los movimientos financieros",
  },
  {
    id: "bank_fee",
    // A fee, such as the one for a withdrawal at another bank's ATM
    // ("COMIS RETIRO CAJERO …"), or an adjustment.
    startsWith: ["COMIS", "AJUSTE"],
    direction: OUT,
    categoryId: "taxes_and_fees",
    titleEs: "Cobro del banco",
    reasonEs: "el banco cobró una comisión o hizo un ajuste",
  },
  {
    id: "card_payment",
    startsWith: ["PAGO SUC VIRT TC"],
    direction: OUT,
    categoryId: "credit_card_payment",
    titleEs: "Pagaste tu tarjeta",
    reasonEs:
      "pagaste una tarjeta de crédito: sus compras están en el extracto de la tarjeta",
  },
  {
    id: "interbank_in",
    startsWith: ["PAGO INTERBANC"],
    direction: IN,
    categoryId: "income_transfer",
    titleEs: "Te llegó plata de otro banco",
    reasonEs: "te llegó plata desde otro banco",
  },
  {
    id: "corresponsal_deposit",
    startsWith: ["CONSIGNACION CORRESPONSAL"],
    direction: IN,
    categoryId: "own_account_transfer",
    titleEs: "Consignación en corresponsal",
    isGuess: true,
    reasonEs:
      "una consignación en corresponsal suele ser tu propio efectivo, aunque puede ser un pago que te hicieron",
  },
  {
    id: "cash_withdrawal",
    startsWith: ["RETIRO CAJERO", "RETIRO CORRESPONSAL"],
    direction: OUT,
    categoryId: "cash_withdrawal",
    titleEs: "Retiro en cajero",
    reasonEs: "sacaste efectivo: no sabemos en qué se usó",
  },
  // Transfers. A Nequi send that names its number asks whether it's the
  // user's (6.3d); only movements exports carry it.
  {
    id: "nequi_out_number",
    startsWith: ["TRANSFERENCIAS A NEQUI"],
    withReference: REFERENCE_KIND.PHONE,
    direction: OUT,
    categoryId: "transfers_to_people",
    titleEs: "Envío por Nequi",
    isGuess: true,
    reasonEs:
      "un envío a Nequi es un pago a una persona, salvo que el número sea tuyo",
  },
  {
    id: "nequi_out",
    startsWith: ["TRANSFERENCIAS A NEQUI"],
    direction: OUT,
    categoryId: "transfers_to_people",
    titleEs: "Envío por Nequi",
    reasonEs:
      "un envío a Nequi es un pago a una persona, salvo que el número sea tuyo",
  },
  {
    id: "nequi_in",
    startsWith: ["TRANSFERENCIA DESDE NEQUI"],
    direction: IN,
    categoryId: "own_account_transfer",
    titleEs: "Te llegó plata de Nequi",
    isGuess: true,
    reasonEs:
      "la plata que llega de un Nequi suele ser tuya; si es de otra persona, es un ingreso",
  },
  {
    id: "virtual_branch_out",
    startsWith: ["TRANSFERENCIA CTA SUC VIRTUAL"],
    direction: OUT,
    categoryId: "transfers_to_people",
    titleEs: "Transferencia a otra cuenta",
    reasonEs: "una transferencia a otra cuenta suele ser un pago a una persona",
  },
  {
    id: "virtual_branch_in",
    startsWith: ["TRANSFERENCIA CTA SUC VIRTUAL"],
    direction: IN,
    categoryId: "income_transfer",
    titleEs: "Transferencia de otra cuenta",
    reasonEs: "te transfirieron plata desde otra cuenta",
  },
  {
    id: "qr_transfer_out",
    startsWith: ["TRANSF QR"],
    direction: OUT,
    categoryId: "transfers_to_people",
    titleEs: "Transferencia por QR",
    reasonEs: "una transferencia por QR suele ser un pago a una persona",
  },
  // The holder's own name, which a quarterly statement prints (6.2): whole
  // words count as moved; a name the bank cut asks the user first.
  {
    id: "own_name_out",
    startsWith: ["TRANSF A"],
    namesHolder: "whole",
    direction: OUT,
    categoryId: "own_account_transfer",
    titleEs: "Transferencia a tu nombre",
    reasonEs: "va a tu propio nombre: la plata sigue siendo tuya",
  },
  {
    id: "own_name_out_cut",
    startsWith: ["TRANSF A"],
    namesHolder: "cut",
    direction: OUT,
    categoryId: "own_account_transfer",
    titleEs: "Transferencia a tu nombre",
    isGuess: true,
    reasonEs:
      "creemos que es tu nombre, cortado por el banco: la plata sigue siendo tuya",
  },
  {
    id: "own_name_in",
    startsWith: ["TRANSF DE"],
    namesHolder: "whole",
    direction: IN,
    categoryId: "own_account_transfer",
    titleEs: "Transferencia de tu nombre",
    reasonEs: "viene de tu propio nombre: volvió a ti, no es un ingreso",
  },
  {
    id: "own_name_in_cut",
    startsWith: ["TRANSF DE"],
    namesHolder: "cut",
    direction: IN,
    categoryId: "own_account_transfer",
    titleEs: "Transferencia de tu nombre",
    isGuess: true,
    reasonEs:
      "creemos que viene de tu nombre, cortado por el banco: no es un ingreso",
  },
  {
    id: "transfer_to_utility",
    startsWith: ["TRANSF A"],
    words: UTILITY_WORDS,
    direction: OUT,
    categoryId: "utilities",
    titleEs: "Pago de servicios",
    reasonEs:
      "algunas empresas de servicios del hogar reciben su pago como transferencia",
  },
  {
    id: "transfer_out",
    startsWith: ["TRANSF A"],
    direction: OUT,
    categoryId: "transfers_to_people",
    titleEs: "Transferencia a una persona",
    reasonEs: "las transferencias a otras personas son pagos a personas",
  },
  {
    id: "transfer_in",
    startsWith: ["TRANSF DE"],
    direction: IN,
    categoryId: "income_transfer",
    titleEs: "Te transfirieron plata",
    reasonEs: "te transfirieron plata desde otra cuenta",
  },
  // Bre-B key payments go to people, stores or the user's own savings.
  {
    id: "own_name_key",
    startsWith: ["PAGO LLAVE"],
    namesHolder: "whole",
    direction: OUT,
    categoryId: "own_account_transfer",
    titleEs: "Pago con llave a tu nombre",
    isGuess: true,
    reasonEs:
      "un pago con llave a tu propio nombre suele ir a otra cuenta tuya",
  },
  {
    id: "own_name_key_cut",
    startsWith: ["PAGO LLAVE"],
    namesHolder: "cut",
    direction: OUT,
    categoryId: "own_account_transfer",
    titleEs: "Pago con llave a tu nombre",
    isGuess: true,
    reasonEs:
      "creemos que la llave es tuya: lleva tu nombre, cortado por el banco",
  },
  {
    id: "key_payment_saving",
    startsWith: ["PAGO LLAVE"],
    words: SAVINGS_WORDS,
    direction: OUT,
    categoryId: "investment",
    titleEs: "Pago con llave a una plataforma",
    isGuess: true,
    reasonEs: "creemos que es tu inversión o tu ahorro",
  },
  {
    id: "key_payment",
    startsWith: ["PAGO LLAVE"],
    direction: OUT,
    categoryId: "transfers_to_people",
    titleEs: "Pago con llave",
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
    titleEs: "Pago por pasarela",
    reasonEs:
      "las pasarelas de pago cobran por otras tiendas y el banco no dice cuál",
  },
  {
    id: "utility_payment",
    startsWith: PAYMENT_PREFIXES,
    words: UTILITY_WORDS,
    direction: OUT,
    categoryId: "utilities",
    titleEs: "Pago de servicios",
    reasonEs:
      "los pagos de luz, agua, gas, internet o celular son servicios del hogar",
  },
  {
    id: "pse_investment",
    startsWith: ["PAGO PSE"],
    words: SAVINGS_WORDS,
    direction: OUT,
    categoryId: "investment",
    titleEs: "Pago a una plataforma de inversión",
    isGuess: true,
    reasonEs: "creemos que es tu inversión o tu ahorro",
  },
  {
    id: "pse_card",
    startsWith: ["PAGO PSE"],
    words: BANK_WORDS,
    direction: OUT,
    categoryId: "credit_card_payment",
    titleEs: "Pago a un banco o una fintech",
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
    titleEs: "Cuota de un crédito",
    isGuess: true,
    reasonEs: "creemos que es la cuota de un crédito",
  },
  ...MERCHANT_RULES,
] as const satisfies readonly CategorizationRule[];
