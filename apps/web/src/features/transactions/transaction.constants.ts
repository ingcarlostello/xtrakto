// The movements list of docs/ui/v8-03: each day with its balance, the
// bank's text as printed with its channel and category (Phase 6.1b) and
// signed amounts. Kinds come with 6.2. The Spanish copy lives here, in one
// place (project rules §5).

/** How many movements the list adds each time ("Mostrar 30 más"). */
export const MOVEMENTS_STEP = 30;

/** The most the list shows at once, whatever the URL asks: about a year. */
export const MAX_MOVEMENTS_SHOWN = 2_000;

/** The attribute that marks each movement's row, to focus the new ones. */
export const MOVEMENT_ROW_ATTRIBUTE = "data-movement";

/** The longest search the list takes: a bank's text is about 30 characters. */
export const MAX_SEARCH_LENGTH = 60;

/** What the bank writes for a movement it didn't describe. */
export const NO_DESCRIPTION_TEXT = "0";

export const TRANSACTIONS_COPY = {
  title: "Movimientos",
  subtitle: "Cada línea de tu extracto, tal como la escribe el banco.",
  movements: { one: "movimiento", other: "movimientos" },
  ofTheBank: "del banco.",
  emptyTitle: "Aún no hay movimientos",
  emptyDescription:
    "Cuando subas un extracto, cada movimiento aparece aquí, día por día, con el texto del banco.",
  listTitle: "Todos los movimientos",
  emptyPeriod: "No hay movimientos en este periodo.",
  dayBalance: "Saldo del día",
  noDescription: "Sin descripción del banco",
  // The kinds (docs/ui/v8-03): the tiles, the filters and an empty filter.
  kinds: {
    income: "Ingresos",
    spending: "Gasto real",
    moved: "Movido",
    all: "Todo",
    review: "Por revisar",
    filtersLabel: "Mostrar",
    tilesLabel: "Totales del periodo por tipo",
    out: { one: "salió", other: "salieron" },
    back: { one: "volvió", other: "volvieron" },
    emptyFilter: "No hay movimientos de este tipo en el periodo.",
  },
  // The tags under each movement, with their names for screen readers.
  tags: {
    channel: "Canal:",
    category: "Categoría:",
    pendingReview: "Por revisar",
  },
  shown: { before: "Mostrando", of: "de" },
  more: { before: "Mostrar", after: "más" },
  // The search (docs/ui/v8-03) and its empty result (v8-13). References are
  // stored as hashes, so it reads descriptions and amounts only.
  search: {
    label: "Buscar movimientos",
    placeholder: "Busca por descripción o monto",
    matches: { one: "movimiento coincide", other: "movimientos coinciden" },
    with: "con",
    noMatches: "No encontramos",
    noMatchesDetail:
      "Busca por otra palabra o por el monto, o quita la búsqueda.",
    clear: "Quitar búsqueda",
  },
  // Where a quarterly statement doesn't reconcile (docs/ui/v8-13): only
  // statements with balances can, and none of their movements count.
  breaks: {
    title: "Dónde no cuadra",
    action: "Ver dónde no cuadra",
    statement: "Extracto trimestral",
    yourStatement: "Tu extracto trimestral",
    offBy: "no cuadra por",
    off: "no cuadra",
    notCounted: "sus movimientos no se cuentan aquí.",
    closingOffBy: "El saldo final no cuadra por",
    closingOff: "El saldo no cuadra",
    detail:
      "Puede faltar una página o una fila. No mostramos sus números hasta que cuadre.",
    rows: {
      one: "fila no cuadra con la anterior: la marcamos abajo.",
      other: "filas no cuadran con la anterior: las marcamos abajo.",
    },
    noRows:
      "Cada fila cuadra con la anterior: lo que no cuadra es el saldo final con la suma de los movimientos.",
    firstRow: "Ir a la primera fila que no cuadra",
    upload: "Subir de nuevo",
    listTitle: "Movimientos del extracto",
    listDetail:
      "Tal como los imprimió el banco, con el saldo después de cada uno. Ninguno se cuenta hasta que cuadre.",
    rowNote: {
      before: "Con el saldo anterior",
      expected: "y este movimiento quedaría",
      printed: "el banco dice",
    },
    rowNoteUnknown: "Aquí el saldo no sigue al de la fila anterior.",
    emptyTitle: "El saldo de tu extracto no cuadra",
    emptyDescription:
      "Por eso aún no mostramos sus movimientos. Mira en qué fila se rompe o súbelo de nuevo.",
  },
  // The period selector (docs/ui/v8-03), without "Año" until Phase 10.2.
  period: {
    quarter: "Trimestre",
    months: "Mes del trimestre",
    verified: "Verificado",
    unverified: "Sin verificar",
    unreconciled: "No cuadra",
    from: "Del",
    to: "al",
    ofYear: "de",
  },
  // The summary, once movements count and before Phase 6.7 builds it.
  ready: {
    title: "Ya tienes",
    description:
      "Míralos día por día, con el texto tal como lo escribe el banco.",
    action: "Ver movimientos",
  },
} as const;
