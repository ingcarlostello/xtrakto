// A card's rate against its month's usury rate (12.4b), in "Tu tarjeta" and
// a purchase's detail.
export const CARD_RATES_COPY = {
  // "Tasa de compras: 1,90% al mes, 25,34% efectivo anual."
  purchases: "Tasa de compras:",
  perMonth: "al mes",
  annual: "efectivo anual",
  // A purchase's detail: "Tasa", and "Usura de oct 2026".
  rate: "Tasa",
  usuryOf: "Usura de",
  // "Por debajo de la usura de oct 2026: 28,34% efectivo anual."
  standing: {
    below: "Por debajo de la usura de",
    at: "En el tope de la usura de",
    above: "Esta tasa pasa la usura de",
  },
  // A purchase's usury: "28,34% efectivo anual · por debajo".
  short: { below: "por debajo", at: "en el tope" },
  aboveAction: "Por ley no puede cobrar más: pídele a tu banco que la revise.",
} as const;
