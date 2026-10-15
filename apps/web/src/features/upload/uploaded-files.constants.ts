// "Archivos subidos" lists the latest files sent, the first few at once.
export const MAX_LISTED_FILES = 30;
export const FIRST_FILES_SHOWN = 5;

// The files sent, newest first, each with its result (docs/ui/v8-07).
export const UPLOADED_FILES_COPY = {
  title: "Archivos subidos",
  subtitle: "Los más recientes primero.",
  showMore: { before: "Ver", after: "más" },
  showLess: "Ver menos",
  had: { one: "ya lo tenías", other: "ya los tenías" },
  nothingNew: "nada nuevo",
  reconciles: "cuadra al centavo",
  chained: "encadenado",
  notReconciled: "no cuadra",
  notReconciledBy: "no cuadra por",
  noBalance: "sin saldo para verificar",
  badge: {
    verified: "Verificado",
    unverified: "Sin verificar",
    unchanged: "Sin cambios",
    notReconciled: "No cuadra",
    processing: "En proceso",
    failed: "No se procesó",
  },
} as const;
