// The words of the insights ("Para revisar", design-system.md §9, insight
// tile): what each one is, and what it means or what to do.
export const INSIGHT_COPY = {
  gmfTax: {
    title: "Te cobraron 4x1000",
    // "Del 10 al 18 de julio, en 9 cobros. Revisa si tu cuenta es exenta."
    in: "en",
    charges: { one: "cobro", other: "cobros" },
    check: "Revisa si tu cuenta es exenta.",
  },
  savingsYield: {
    title: "Intereses de tu ahorro",
    // "Un 0,05% efectivo anual sobre tu saldo promedio de $10,4M."
    rate: "Un",
    lessThan: "Menos del",
    least: "0,01",
    annual: "efectivo anual sobre tu saldo promedio de",
  },
  cash: {
    // "17 retiros de efectivo"
    title: { one: "retiro de efectivo", other: "retiros de efectivo" },
    note: "No sabemos en qué se usó.",
  },
  gateways: {
    // "6 pagos sin tienda identificada"
    title: {
      one: "pago sin tienda identificada",
      other: "pagos sin tienda identificada",
    },
    note: "Pasaron por pasarelas de pago y el banco no dice dónde compraste: elige su categoría en Movimientos.",
  },
  newRecurring: {
    // "Nuevo pago fijo: GIMNASIO FIT"
    title: "Nuevo pago fijo:",
    // "Se repite desde julio, el día 10.", "…, entre el 8 y el 12."
    since: "Se repite desde",
    onDay: "el día",
    between: "entre el",
    andThe: "y el",
  },
  recurringRose: {
    // "EMPRESA DE ENERGIA subió 12%"
    rose: "subió",
    // "De $162.300 en julio a $182.000 en septiembre."
    from: "De",
    in: "en",
    to: "a",
    check: "Revisa tu consumo o la tarifa.",
  },
} as const;
