// A card's installments (12.3d): "3 de 24 · $41.667 al mes", in a
// purchase's row and its detail, and "Cuotas que te faltan".
export const CARD_INSTALLMENTS_COPY = {
  of: "de",
  perMonth: "al mes",
  // "en tu extracto de nov 2026".
  inStatement: "en tu extracto de",
  // "$916.667, hasta ago 2028".
  until: "hasta",
  installment: "Cuota",
  leftToPay: "Te falta pagar",
  // "21 cuotas", when the statement prints no amount left.
  installments: { one: "cuota", other: "cuotas" },
} as const;
