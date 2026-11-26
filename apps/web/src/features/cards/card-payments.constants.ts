// The other side of a payment to a card (12.3e), in a movement's detail:
// "Llegó a tu tarjeta Nu ••••5678", "Salió de tu cuenta de ahorros ••••8901".
export const CARD_PAYMENTS_COPY = {
  label: "Pago de tu tarjeta",
  reached: "Llegó a tu",
  cameFrom: "Salió de tu",
} as const;
