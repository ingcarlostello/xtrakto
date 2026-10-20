// "Pagos fijos" (docs/ui/v8-04): the payments that repeat each month, and
// how we found them.
export const RECURRING_COPY = {
  title: "Pagos fijos",
  subtitle: "Lo que se repite cada mes.",
  found: "Encontramos",
  and: "y",
  fixed: { one: "gasto fijo", other: "gastos fijos" },
  repeating: {
    one: "pago que se repite pero no es gasto",
    other: "pagos que se repiten pero no son gasto",
  },
  // The tiles above the list: what the fixed payments take, and the one
  // that rose the most.
  tiles: {
    label: "Lo que pagas",
    monthly: "Pagas al mes",
    monthlyCaption: "Sale de tu cuenta aunque no hagas nada.",
    yearly: "Al año",
    // "Lo que suman estos 7 pagos en 12 meses."
    yearlyOne: "Lo que suma este pago en 12 meses.",
    yearlyOther: "Lo que suman estos",
    yearlyOtherEnd: "pagos en 12 meses.",
    // "Energía subió 12%", "De $162.300 en julio a $182.000 en septiembre."
    rose: "subió",
    from: "De",
    in: "en",
    to: "a",
    check: "Revisa tu consumo o la tarifa.",
  },
  listTitle: "Tus pagos fijos",
  sorted: "Ordenados por monto.",
  barsShow: "Las barras muestran",
  // "Activos · 7 / Ya no aparecen · 1".
  filtersLabel: "Mostrar",
  active: "Activos",
  stopped: "Ya no aparecen",
  stoppedSubtitle: "Se repetían cada mes, pero no aparecen en",
  noneIn: "No hay pagos fijos en",
  notYet: "Aún no aparece en",
  lastPaid: "Último pago el",
  totalIn: "Total en",
  movedTitle: "También se repiten, pero no son gasto",
  movedSubtitle:
    "Plata que pasa a tu tarjeta o a tu ahorro. Sigue siendo tuya.",
  howTitle: "Cómo los encontramos",
  howText:
    "Un pago es fijo si aparece al menos 3 meses seguidos, en fechas cercanas y por un monto parecido, aunque el banco lo escriba distinto o lo pagues por otro canal (PSE, transferencia o QR).",
  noneTitle: "No hay pagos fijos en este periodo",
  noneDescription:
    "Un pago es fijo cuando aparece al menos 3 meses seguidos. Con los extractos de más meses podemos encontrar los tuyos.",
  // "Mensual · día 5", "Mensual · entre el 1 y el 4".
  monthly: "Mensual",
  onDay: "día",
  between: "entre el",
  andThe: "y el",
  // "También: “PAGO PSE Electrificadora de S”."
  also: "También:",
  // "2 cuotas: $1.540.000 y $311.000."
  installments: { one: "cuota", other: "cuotas" },
  payments: { one: "pago", other: "pagos" },
  trends: {
    stable: "Estable",
    rose: "Subió",
    varies_little: "Varía poco",
    variable: "Monto variable",
  },
  severalChannels: "Varios canales",
  // "$48.000 a $2.090.000".
  rangeTo: "a",
  channel: "Canal:",
  // What the bars say to a screen reader: "Julio $162.300, …".
  barsLabel: "Lo pagado cada mes",
  unpaid: "sin pago",
} as const;
