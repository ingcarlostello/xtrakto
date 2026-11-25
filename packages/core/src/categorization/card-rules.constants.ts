import { ACCOUNT_TYPE } from "../statements/statement.constants";
import { MONEY_DIRECTION } from "./categorization.constants";
import type { CategorizationRule } from "./categorization.types";

const { IN, OUT } = MONEY_DIRECTION;
const { CREDIT_CARD } = ACCOUNT_TYPE;

/**
 * A credit card's own texts (ROADMAP Appendix A.4 and A.5), only on a card's
 * account (12.3a, ADR 0040): what the card costs is real spending, while a
 * payment to it and a balance transfer only move money. A purchase is its
 * merchant's name, which the rules for purchases read.
 */
export const CARD_RULES = [
  {
    id: "card_late_interest",
    startsWith: ["INTERESES", "INTERES"],
    words: ["MORA"],
    accountType: CREDIT_CARD,
    direction: OUT,
    categoryId: "taxes_and_fees",
    titleEs: "Intereses de mora",
    reasonEs:
      "la tarjeta te cobró intereses por pagar después de la fecha límite",
  },
  {
    id: "card_interest",
    startsWith: ["INTERESES", "INTERES"],
    accountType: CREDIT_CARD,
    direction: OUT,
    categoryId: "taxes_and_fees",
    titleEs: "Intereses de tu tarjeta",
    reasonEs: "son los intereses que la tarjeta te cobró por lo que debías",
  },
  {
    id: "card_fee",
    startsWith: ["CUOTA DE MANEJO"],
    accountType: CREDIT_CARD,
    direction: OUT,
    categoryId: "taxes_and_fees",
    titleEs: "Cuota de manejo",
    reasonEs: "es lo que el banco te cobra por tener la tarjeta",
  },
  {
    id: "card_conversion",
    startsWith: ["COMISION POR CAMBIO DE MONEDA"],
    accountType: CREDIT_CARD,
    direction: OUT,
    categoryId: "taxes_and_fees",
    titleEs: "Comisión por cambio de moneda",
    reasonEs: "una compra en otra moneda paga una comisión al pasarla a pesos",
  },
  {
    id: "card_advance",
    startsWith: ["AVANCE"],
    accountType: CREDIT_CARD,
    direction: OUT,
    categoryId: "cash_withdrawal",
    titleEs: "Avance en efectivo",
    reasonEs: "sacaste efectivo con la tarjeta: no sabemos en qué se usó",
  },
  {
    id: "card_balance_transfer",
    startsWith: ["COMPRA DE CARTERA"],
    accountType: CREDIT_CARD,
    direction: OUT,
    categoryId: "credit_card_payment",
    titleEs: "Compra de cartera",
    reasonEs:
      "pasaste a esta tarjeta la deuda de otro banco: no es un gasto nuevo",
  },
  // Before the payments, which a refund's words can follow ("ABONO
  // DEVOLUCION").
  {
    id: "card_refund",
    words: ["DEVOLUCION*", "REVERSO*"],
    accountType: CREDIT_CARD,
    direction: IN,
    categoryId: "refund",
    titleEs: "Devolución de una compra",
    reasonEs: "te devolvieron la plata de una compra",
  },
  {
    id: "card_payment_received",
    startsWith: ["ABONO", "PAGO", "GRACIAS POR TU PAGO"],
    accountType: CREDIT_CARD,
    direction: IN,
    categoryId: "credit_card_payment",
    titleEs: "Pagaste tu tarjeta",
    reasonEs:
      "es la plata con la que pagaste la tarjeta: solo se movió, no es un ingreso",
  },
] as const satisfies readonly CategorizationRule[];
