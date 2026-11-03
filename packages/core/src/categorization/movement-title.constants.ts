import type { CategoryId } from "../categories/category.types";
import type { CategorizationRuleId } from "./categorization.types";

/**
 * What a movement is in plain words when its category isn't its rule's:
 * the user's answer or correction, or the LLM's category (8.6a).
 */
export const CATEGORY_TITLES: Readonly<Record<CategoryId, string>> = {
  groceries: "Compra de mercado",
  restaurants: "Restaurante o domicilio",
  transport: "Transporte",
  utilities: "Pago de servicios",
  housing: "Vivienda",
  health: "Salud",
  education: "Educación",
  entertainment: "Entretenimiento",
  shopping: "Compras",
  subscriptions: "Suscripción",
  loan_payment: "Cuota de un crédito",
  transfers_to_people: "Pago a una persona",
  payment_gateways: "Pago por pasarela",
  cash_withdrawal: "Retiro de efectivo",
  taxes_and_fees: "Cobro del banco",
  other_spending: "Otro gasto",
  income_transfer: "Te transfirieron plata",
  interest: "Intereses",
  deposit: "Consignación",
  refund: "Devolución",
  other_income: "Otro ingreso",
  own_account_transfer: "Entre tus cuentas",
  credit_card_payment: "Pagaste tu tarjeta",
  investment: "A tu inversión",
};

/** A title for the movements whose text has one of these words. */
export type TitleRefinement = {
  readonly words: readonly string[];
  readonly titleEs: string;
};

/**
 * Each home service a utility's words name, as Pagos fijos calls it (8.6d,
 * docs/ui/v8-04): "Energía" where a movement reads "Pago de energía".
 */
export const HOME_SERVICES = {
  energy: "Energía",
  gas: "Gas",
  water: "Agua",
  phone_internet: "Celular o internet",
  tv: "Televisión",
} as const;

export type HomeService = keyof typeof HOME_SERVICES;

/** A home service's title, for the texts with the words of its companies. */
export type ServiceTitle = TitleRefinement & { readonly service: HomeService };

/** What a home service's company sells, as the utility rules' words name it. */
export const UTILITY_TITLES: readonly ServiceTitle[] = [
  {
    service: "energy",
    words: [
      "ENERGIA",
      "ELECTRIFIC*",
      "ENEL",
      "CODENSA",
      "CELSIA",
      "AFINIA",
      "AIR E",
      "ESSA",
    ],
    titleEs: "Pago de energía",
  },
  { service: "gas", words: ["GAS", "GASES", "VANTI"], titleEs: "Pago de gas" },
  {
    service: "water",
    words: ["ACUEDUCTO", "ALCANTARIL*"],
    titleEs: "Pago de agua",
  },
  {
    service: "phone_internet",
    words: [
      "CLARO",
      "COMCEL",
      "MOVISTAR",
      "TELEFONICA",
      "TIGO",
      "ETB",
      "UNE",
      "WOM",
    ],
    titleEs: "Pago de celular o internet",
  },
  { service: "tv", words: ["DIRECTV"], titleEs: "Pago de televisión" },
];

/**
 * Titles more precise than their rule's, where the rule's words name what
 * was paid: the first that matches wins, else the rule's own title.
 */
export const TITLE_REFINEMENTS: Partial<
  Record<CategorizationRuleId, readonly TitleRefinement[]>
> = {
  utility_payment: UTILITY_TITLES,
  transfer_to_utility: UTILITY_TITLES,
  cash_withdrawal: [
    { words: ["RETIRO CORRESPONSAL"], titleEs: "Retiro en corresponsal" },
  ],
};
