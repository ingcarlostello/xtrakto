// The Spanish copy of a file's result once processed, beside the helpers
// that build it, in one place (project rules §5).

// A file's result once processed (docs/ui/v8-08, within Stage 5).
export const RESULT_COPY = {
  read: "Listo: leímos tu archivo",
  // The movements of its account in its period (v8-08's "Lo que sigue").
  viewMovements: "Ver movimientos",
  // Where its balance breaks (v8-13), for a statement that doesn't reconcile.
  viewBreaks: "Ver dónde no cuadra",
  alreadyHad: "Ya tenías todo este archivo",
  replaced: "Listo: reemplazamos el extracto que no cuadraba",
  notReconciled: "El saldo final no cuadra",
  notReconciledBy: "El saldo final no cuadra por",
  notReconciledNote:
    "Puede faltar una página o una fila. No mostramos sus números hasta que cuadre.",
  inFile: {
    one: "movimiento en el archivo",
    other: "movimientos en el archivo",
  },
  had: {
    one: "ya lo tenías: no se duplica",
    other: "ya los tenías: no se duplican",
  },
  new: { one: "nuevo", other: "nuevos" },
  verified: "Saldo verificado",
  reconcile: { one: "cuadra", other: "cuadran" },
  chained: "Encadenado",
  chainedTo: "Empieza donde terminó",
  notReconciledShort: "No cuadra",
  notReconciledShortBy: "No cuadra por",
  checkTheFile: "Revisa el archivo",
  noBalance: "Sin saldo para verificar",
  movementsFile: "Archivo de movimientos",
  stepRead: "Leído en tu navegador",
  // A PDF's reading: "2 páginas · 48 filas. Unimos 3 descripciones partidas
  // en dos líneas."
  pages: { one: "página", other: "páginas" },
  rows: { one: "fila", other: "filas" },
  joined: "Unimos",
  joinedDescriptions: {
    one: "descripción partida en dos líneas",
    other: "descripciones partidas en dos líneas",
  },
  stepRecognized: "Reconocido",
  stepDuplicates: "Revisando duplicados",
  noneHad: "Ninguno estaba en tu cuenta.",
  hadIn: "ya estaban en tu cuenta: no se duplican.",
  coveredNote: "Tu extracto trimestral ya los traía.",
  hiddenNote: "Ahora cuentan los de este extracto, que trae saldos.",
  keptApart: "Quedan guardados, pero no cuentan hasta que el saldo cuadre.",
  verifiedDetail: "Cada movimiento cuadra con su saldo, al centavo.",
  notReconciledDetail:
    "Revisa que el archivo esté completo, o sube una versión que cuadre.",
  // What a movements export matched (Phase 10.1b, v8-08 and v8-13).
  references: { one: "referencia agregada", other: "referencias agregadas" },
  hadInQuarterly: "ya estaban en tu extracto trimestral.",
  someInQuarterly: "De ellos,",
  inQuarterly: "venían en tu extracto trimestral.",
  interestDayApart:
    "Los intereses vienen con un día de diferencia entre archivos; igual los reconocimos.",
  verifiedByQuarterly: "Verificado por tu extracto trimestral",
  verifiedByQuarterlyDetail:
    "Este tipo de archivo no trae saldos; lo comparamos con",
  andMatches: "y coincide.",
  verifiedWithQuarterly: "Verificado con tu extracto trimestral",
  verifiedWithQuarterlyDetail:
    "Este archivo no trae saldos, pero todo coincide con",
  noBalanceStep: "Este archivo no trae saldos",
  noBalanceDetail:
    "Los movimientos de la Sucursal Virtual no los incluyen. Los verificamos cuando subas el extracto trimestral de ese periodo.",
  partlyVerifiedDetail:
    "coinciden con tu extracto trimestral; los demás, cuando subas el de su periodo.",
  stepClassified: "Clasificado",
  newReferences: { one: "referencia nueva", other: "referencias nuevas" },
  referencesKinds: "como números de Nequi o de PSE.",
  and: "y",
} as const;

// What follows the files sent (v8-08's "Lo que sigue", Phase 10.1b).
export const NEXT_STEP_COPY = {
  title: "Lo que sigue",
  toReviewIn: "por revisar en",
  text: "Confírmalos en la revisión: pueden cambiar tu gasto real.",
  review: "Revisar ahora",
  movements: "Ver movimientos",
  moreFiles:
    "¿Tienes más archivos? Súbelos todos juntos; si se cruzan, no pasa nada.",
} as const;
