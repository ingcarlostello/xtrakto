// The Spanish copy of the pages before there is data. Each page's feature
// takes its copy over when it gets real content (5.3, 5.7, 6.5, 6.7).
export const PAGE_COPY = {
  uploadAction: "Subir extracto",
  summary: {
    title: "Resumen",
    subtitle: "En qué se fue tu plata, en palabras claras.",
    emptyTitle: "Sube tu primer extracto",
    emptyDescription:
      "Te mostramos lo que de verdad gastaste, lo que solo moviste entre tus cuentas y lo que entró, con cada saldo verificado.",
  },
  transactions: {
    title: "Movimientos",
    subtitle: "Cada línea de tu extracto, traducida.",
    emptyTitle: "Aún no hay movimientos",
    emptyDescription:
      "Cuando subas un extracto, cada movimiento aparece aquí con el texto del banco y lo que significa.",
  },
  recurring: {
    title: "Pagos fijos",
    subtitle: "Lo que se repite cada mes.",
    emptyTitle: "Aún no hay pagos fijos",
    emptyDescription:
      "Con extractos de al menos dos meses encontramos tus cuotas, servicios y suscripciones, y te avisamos si alguno sube.",
  },
  upload: {
    title: "Subir extracto",
    subtitle: "Bancolombia, cuenta de ahorros.",
    emptyTitle: "Tu archivo no sale de tu navegador",
    emptyDescription:
      "Leemos el extracto en tu equipo y solo enviamos sus movimientos: nunca el archivo ni su contraseña. La subida llega muy pronto.",
  },
} as const;
