// This month's calendar on "Pagos fijos" (docs/ui/v8-04): when each fixed
// payment goes out, and what hasn't appeared yet.
export const RECURRING_CALENDAR_COPY = {
  subtitle: "Cuándo sale cada pago.",
  // "Hoy es 20 de octubre."
  today: "Hoy es",
  // What a screen reader hears: "Cuándo sale cada pago en octubre: …".
  label: "Cuándo sale cada pago en",
  weekdays: ["L", "M", "M", "J", "V", "S", "D"],
  range: "Rango de días",
  fixedDay: "Día fijo",
  todayLegend: "Hoy",
  // "Pendiente: gas, del 8 al 12.", "Pendiente: internet, el 5."
  pending: "Pendiente:",
  onDay: "el",
  from: "del",
  to: "al",
  // "Aún no aparece. Unos $31 mil, por transferencia o PSE."
  notYet: "Aún no aparece.",
  about: "Unos",
  by: "por",
  or: "o",
  nothingPending: "Nada pendiente hasta hoy.",
} as const;
