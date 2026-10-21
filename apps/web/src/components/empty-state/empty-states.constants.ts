// The Spanish copy of the pages before there is data. Each page's feature
// takes its copy over when it gets real content (6.5, 6.7); the upload and
// movements features already have. Copy says only what works in Stage 5.
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
  recurring: {
    title: "Pagos fijos",
    subtitle: "Lo que se repite cada mes.",
    emptyTitle: "Aún no hay pagos fijos",
    emptyDescription:
      "Con extractos de 3 meses seguidos encontramos tus cuotas, servicios y suscripciones.",
  },
  categories: {
    title: "Categorías",
    subtitle: "En qué se fue tu gasto real y a dónde se movió lo demás.",
    emptyTitle: "Aún no hay categorías",
    emptyDescription:
      "Cuando subas un extracto, separamos tu gasto real por categoría y te mostramos a dónde se movió lo demás.",
  },
} as const;
