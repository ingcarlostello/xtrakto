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
    // Each row opens its category's detail (6.8b).
    touch: "Toca una para ver sus movimientos.",
  },
  // A category's detail (docs/ui/v8-06): "Gasto real · julio a septiembre
  // de 2026", its tiles and what it counts as.
  detail: {
    back: "Categorías",
    kind: "Gasto real",
    tilesLabel: "Lo que se fue en esta categoría",
    totalQuarter: "Total del trimestre",
    // "Total de agosto".
    totalOf: "Total de",
    average: "Promedio por movimiento",
    // "El más alto: $186.000, el 12 de agosto."
    largest: "El más alto:",
    on: "el",
    onlyOne: "Un solo movimiento, el",
    byMonth: "Por mes",
    mostMonth: "el mes con más",
    // "No hubo gasto en «Efectivo» en este periodo."
    noneIn: "No hubo gasto en",
    inPeriod: "en este periodo.",
  },
  // Its newest movements, each opening its detail in Movimientos.
  latest: {
    title: "Movimientos de esta categoría",
    subtitle: "Los más recientes primero.",
    noDescription: "Sin descripción del banco",
    channel: "Canal:",
    pendingReview: "Por revisar",
    // "Mostrando 4 de 31" and "Ver los 31 movimientos".
    shown: { before: "Mostrando", of: "de" },
    all: { before: "Ver los", after: "movimientos" },
    one: "Ver en Movimientos",
  },
  // "Semana a semana" (docs/ui/v8-06): what the category took each week.
  weeks: {
    title: "Semana a semana",
    guide: "Cada punto es lo que gastaste en esa semana. Si sube, algo cambió.",
    legend: "Gasto por semana",
    // "Semana del 5 de agosto: $410.000".
    weekOf: "Semana del",
    // "9 movimientos. Una semana normal es de $210 mil."
    normalWeek: "Una semana normal es de",
    // "La mayoría de las semanas no tuvo gasto en «Efectivo»."
    mostWeeks: "La mayoría de las semanas no tuvo gasto en",
    // "Gasto en «Efectivo» por semana, del 1 de julio al 29 de septiembre.
    // La semana con más fue la del 15 de julio: $300.000."
    spentIn: "Gasto en",
    perWeek: "por semana, del",
    to: "al",
    mostIn: "La semana con más fue la del",
  },
  // "Dónde más" (docs/ui/v8-06): where its money went, however the bank
  // wrote each place.
  places: {
    title: "Dónde más",
    subtitle: "Juntamos las formas en que el banco escribe el mismo lugar.",
    // "22 movimientos · COMPRA EN APP DOMICILIOS · también PAGO QR APP DOMICIL".
    also: "también",
    more: "más",
    // "Y 3 lugares más: $45 mil."
    andMore: "Y",
    rest: { one: "lugar más", other: "lugares más" },
  },
  settings: {
    title: "Ajustes de esta categoría",
    countsAs: "Cuenta como gasto real",
    // "Efectivo siempre suma a tu gasto real."
    alwaysAdds: "siempre suma a tu gasto real.",
    rules: { one: "regla tuya", other: "reglas tuyas" },
    noRules: "Sin reglas tuyas",
    noRulesNote:
      "Las crean tus respuestas en la revisión y tus correcciones en Movimientos.",
    // "TRANSF A ANA LUCIA MAR, RETIRO CAJERO CENTRO y 2 más".
    more: "más",
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

/** How many of its newest movements a category's detail lists (docs/ui/v8-06). */
export const LATEST_MOVEMENTS = 4;

/** How many of the user's rules "Ajustes de esta categoría" names. */
export const NAMED_RULES = 3;

/** How many places "Dónde más" lists, the most money first. */
export const PLACES_SHOWN = 5;

/** How many other ways the bank wrote a place its note names. */
export const OTHER_TEXTS = 2;

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
