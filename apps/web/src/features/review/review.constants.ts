import {
  ArrowLeftRight,
  Banknote,
  CreditCard,
  Download,
  FileText,
  Landmark,
  TrendingUp,
  Users,
} from "lucide-react";
import type { ReviewAnswer, ReviewGroupDefinition } from "./review.types";

// The quick review's Spanish copy (docs/ui/v8-02, and the summary's banner
// in v8-01).
export const REVIEW_COPY = {
  pageTitle: "Revisión rápida",
  title: "Revisa antes de ver tu resumen",
  subtitle:
    "Hay movimientos que no podemos clasificar solos. Respondes por grupo, no uno por uno.",
  groupsLabel: "Grupos por revisar",
  textsLabel: "Así lo escribe el banco",
  answersLabel: "Respuestas",
  suggested: "Sugerido: la primera",
  movements: { one: "movimiento", other: "movimientos" },
  groups: { one: "grupo", other: "grupos" },
  failed: "No pudimos guardar tu respuesta. Vuelve a intentarlo.",
  nothingTitle: "Nada por revisar en este trimestre",
  nothingDescription:
    "Cada movimiento de este trimestre ya tiene su categoría.",
  toMovements: "Ver movimientos",
  emptyTitle: "Aún no hay movimientos",
  emptyDescription:
    "Cuando subas un extracto, aquí te preguntamos por lo que no podemos clasificar solos.",
  // An answered group: "Son tuyas: 5 movimientos cuentan como movido."
  change: "Cambiar",
  keep: "Mantener mi respuesta",
  counts: { one: "cuenta como", other: "cuentan como" },
  stays: { one: "sigue como", other: "siguen como" },
  guessKept: "nuestra mejor suposición",
  kinds: { spending: "gasto real", income: "ingreso", internal: "movido" },
  moreTexts: "más",
  // The status beside the title: "6 grupos · 38 movimientos".
  allAnswered: "Todo respondido",
  underAMinute: "Menos de un minuto",
  aMinute: "Un minuto",
  aboutMinutes: { before: "Unos", after: "minutos" },
  // The summary's banner while groups wait (design-system.md §9).
  bannerYouHave: "Tienes",
  bannerToReview: "por revisar",
  bannerText:
    "Mientras tanto usamos nuestra mejor suposición. Confírmalos: pueden cambiar tu gasto real.",
  bannerAction: "Revisar ahora",
} as const;

/**
 * What each answer gives the movements of its group, and how an answered
 * group says it back. "No sé" gives none: they keep the best guess and
 * leave the review. "Una compra" is "Otros": the store stays unknown.
 */
export const REVIEW_ANSWERS = {
  mine: {
    label: "Sí, son mías",
    said: "Son tuyas",
    categoryId: "own_account_transfer",
  },
  someone_else: {
    label: "Son de otra persona",
    said: "Son de otra persona",
    categoryId: "transfers_to_people",
  },
  investment: {
    label: "Mi inversión o ahorro",
    said: "Tu inversión o ahorro",
    categoryId: "investment",
  },
  person: {
    label: "Pago a otra persona",
    said: "Pagos a otras personas",
    categoryId: "transfers_to_people",
  },
  purchase: {
    label: "Una compra",
    said: "Compras",
    categoryId: "other_spending",
  },
  unsure: { label: "No sé", said: "No sé", categoryId: null },
  came_back: {
    label: "Sí, volvió de mis cuentas",
    said: "Volvió de tus cuentas",
    categoryId: "own_account_transfer",
  },
  income: {
    label: "No, es un ingreso",
    said: "Es un ingreso",
    categoryId: "income_transfer",
  },
  own_cash: {
    label: "Era efectivo mío",
    said: "Era efectivo tuyo",
    categoryId: "own_account_transfer",
  },
  paid_to_me: {
    label: "Es un ingreso",
    said: "Pagos que te hicieron",
    categoryId: "deposit",
  },
  card: {
    label: "Pago de mi tarjeta",
    said: "Pago de tarjeta",
    categoryId: "credit_card_payment",
  },
  loan: {
    label: "Cuota de un crédito",
    said: "Cuotas de un crédito",
    categoryId: "loan_payment",
  },
  spending: { label: "Un gasto", said: "Gastos", categoryId: "other_spending" },
  moved: {
    label: "Plata que solo moví",
    said: "Plata que solo moviste",
    categoryId: "own_account_transfer",
  },
  other_income: {
    label: "Un ingreso",
    said: "Ingresos",
    categoryId: "other_income",
  },
  back_from_mine: {
    label: "Volvió de mis cuentas",
    said: "Volvió de tus cuentas",
    categoryId: "own_account_transfer",
  },
} as const satisfies Record<string, ReviewAnswer>;

/**
 * The questions of the quick review, in the order it asks them, each with
 * the rules whose guesses it asks about and its answers, the best guess
 * first. Card payments from the virtual branch aren't asked (decided with
 * the human, Phase 6.3a).
 */
export const REVIEW_GROUPS = [
  {
    id: "own_name",
    name: "Transferencias a tu nombre",
    ruleIds: ["own_name_out_cut", "own_name_key", "own_name_key_cut"],
    icon: ArrowLeftRight,
    question: "¿Estas transferencias a tu nombre son tuyas?",
    context:
      "Van a tu nombre, que el banco a veces corta. Si llegan a otra cuenta tuya, no son gasto.",
    answers: ["mine", "someone_else"],
  },
  {
    id: "key_platforms",
    name: "Pagos con llave a plataformas",
    ruleIds: ["key_payment_saving"],
    icon: TrendingUp,
    question: "¿Qué son estos pagos con llave (Bre-B)?",
    context:
      "Van a plataformas, no a personas. Si son tu inversión o tu ahorro, no son gasto.",
    answers: ["investment", "person", "purchase", "unsure"],
  },
  {
    id: "key_people",
    name: "Pagos con llave a personas",
    ruleIds: ["key_payment"],
    icon: Users,
    question: "¿Estos pagos con llave (Bre-B) fueron a otras personas?",
    context:
      "Van a nombres de personas o negocios. Si fueron compras o tu propio ahorro, cuéntanos.",
    answers: ["person", "purchase", "investment", "unsure"],
  },
  {
    id: "money_in",
    name: "Plata que entró",
    ruleIds: ["nequi_in", "own_name_in_cut"],
    icon: Download,
    question: "¿Esta plata que entró es tuya?",
    context:
      "Viene de tu nombre o de un Nequi. Si es tuya, no la contamos como ingreso.",
    answers: ["came_back", "income"],
  },
  {
    id: "corresponsal",
    name: "Consignaciones en corresponsal",
    ruleIds: ["corresponsal_deposit"],
    icon: Banknote,
    question: "¿Las consignaciones en corresponsal son tu plata?",
    context:
      "Alguien depositó efectivo en tu cuenta. Puede ser tu propio efectivo o un pago que te hicieron.",
    answers: ["own_cash", "paid_to_me"],
  },
  {
    id: "pse_banks",
    name: "Pagos por PSE a bancos y fintechs",
    ruleIds: ["pse_card"],
    icon: CreditCard,
    question: "¿Estos pagos por PSE son de tus tarjetas?",
    context:
      "Van a bancos o fintechs. Pueden ser el pago de una tarjeta, la cuota de un crédito o una compra.",
    answers: ["card", "loan", "purchase"],
  },
  {
    id: "pse_investment",
    name: "Pagos por PSE a plataformas de inversión",
    ruleIds: ["pse_investment"],
    icon: TrendingUp,
    question: "¿Estos pagos por PSE van a tu inversión?",
    context:
      "Van a plataformas de inversión o ahorro. Si son tuyos, no son gasto.",
    answers: ["investment", "purchase"],
  },
  {
    id: "pse_loans",
    name: "Pagos por PSE a entidades de crédito",
    ruleIds: ["pse_loan"],
    icon: Landmark,
    question: "¿Estos pagos por PSE son cuotas de un crédito?",
    context:
      "Van a entidades que prestan plata. Una cuota es gasto real; el pago de una tarjeta solo se mueve.",
    answers: ["loan", "card", "purchase"],
  },
  {
    id: "no_description_out",
    name: "Movimientos sin descripción",
    ruleIds: ["no_description_out"],
    icon: FileText,
    question: "¿Qué son estos movimientos sin descripción?",
    context:
      "El banco no escribió qué fueron, así que tu respuesta vale solo para estos.",
    answers: ["spending", "moved"],
  },
  {
    id: "no_description_in",
    name: "Plata que entró sin descripción",
    ruleIds: ["no_description_in"],
    icon: FileText,
    question: "¿Qué es esta plata que entró sin descripción?",
    context:
      "El banco no escribió de dónde vino, así que tu respuesta vale solo para esta.",
    answers: ["other_income", "back_from_mine"],
  },
] as const satisfies readonly ReviewGroupDefinition[];
