// The Spanish copy of the pages before there is data. Each page's feature
// takes its copy over when it gets real content (5.7, 6.5, 6.7); the upload
// feature already has. Copy says only what works in Stage 5.
export const PAGE_COPY = {
  // A link to the upload screen: files are uploaded only there.
  uploadAction: "Ir a Subir",
  summary: {
    title: "Resumen",
    subtitle: "Aún no has subido ningún extracto.",
    emptyTitle: "Sube tu primer extracto",
    emptyDescription:
      "Lo leemos en tu navegador, verificamos cada saldo al centavo y te mostramos tus movimientos día por día.",
  },
  transactions: {
    title: "Movimientos",
    subtitle: "Cada línea de tu extracto, tal como la escribe el banco.",
    emptyTitle: "Aún no hay movimientos",
    emptyDescription:
      "Cuando subas un extracto, cada movimiento aparece aquí, día por día, con el texto del banco.",
  },
  recurring: {
    title: "Pagos fijos",
    subtitle: "Lo que se repite cada mes.",
    emptyTitle: "Aún no hay pagos fijos",
    emptyDescription:
      "Con extractos de 3 meses seguidos encontramos tus cuotas, servicios y suscripciones.",
  },
} as const;
