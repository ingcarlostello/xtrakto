import type { CategoryId, CategoryKind } from "@xtrakto/core";

// "Categorías" (docs/ui/v8-05): where the real spending went, by category,
// and where the rest only moved.
export const CATEGORIES_COPY = {
  spending: {
    title: "Tu gasto real por categoría",
    // "$24,4M en el trimestre, de mayor a menor."
    inQuarter: "en el trimestre",
    inMonth: "en",
    largestFirst: "de mayor a menor.",
    none: "No hubo gasto real en este periodo.",
    // "19% de tu gasto real · 3 movimientos · PSE".
    ofSpending: "de tu gasto real",
    lessThan: "menos del",
    movements: { one: "movimiento", other: "movimientos" },
    label: "Gasto real por categoría",
  },
  moved: {
    title: "Movido no es gasto",
    // "Salieron $29,8M y volvieron $2,8M. Todo sigue siendo tuyo."
    wentOut: "Salieron",
    and: "y volvieron",
    cameBack: "Volvieron",
    stillYours: "Todo sigue siendo tuyo.",
    none: "No moviste plata entre tus cuentas, tu inversión ni tus tarjetas.",
    back: "Volvió de tus cuentas",
    backNote: "Plata tuya que regresó: no es ingreso.",
  },
  rules: {
    title: "Tus reglas",
    subtitle:
      "Lo que respondiste en la revisión o corregiste en Movimientos, aplicado a todos tus extractos.",
    none: "Aún no tienes reglas. Las crean tus respuestas en la revisión y tus correcciones en Movimientos.",
    // "ref ••• 1270".
    reference: "ref •••",
    // "Si sale: Entre tus cuentas · movido".
    out: "Si sale:",
    in: "Si entra:",
  },
} as const;

/** Where money that only moved went, by its category. */
export const MOVED_LABELS: Partial<Record<CategoryId, string>> = {
  investment: "A tu inversión",
  own_account_transfer: "A tus cuentas",
  credit_card_payment: "Pago de tarjetas",
};

/** A kind in a rule's words: "Entre tus cuentas · movido". */
export const KIND_WORDS: Record<CategoryKind, string> = {
  spending: "gasto real",
  income: "ingreso",
  internal: "movido",
};
