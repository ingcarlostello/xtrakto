// The movements list of docs/ui/v8-03: each day with its balance, the
// bank's text as printed with its channel and category (Phase 6.1b) and
// signed amounts. Kinds come with 6.2. The Spanish copy lives here, in one
// place (project rules §5).
import type { CategoryId, CategoryKind } from "@xtrakto/core";

/** How many movements the list adds each time ("Mostrar 30 más"). */
export const MOVEMENTS_STEP = 30;

/** The most the list shows at once, whatever the URL asks: about a year. */
export const MAX_MOVEMENTS_SHOWN = 2_000;

/** The attribute that marks each movement's row, to focus the new ones. */
export const MOVEMENT_ROW_ATTRIBUTE = "data-movement";

/** The attribute that marks what a form of the detail saved, which can take the focus. */
export const SAVE_STATUS_ATTRIBUTE = "data-save-status";

/** The attribute that marks the link closing a movement's detail, which Escape follows. */
export const DETAIL_CLOSE_ATTRIBUTE = "data-detail-close";

/** The id of a movement's link in the list, which gets the focus back once its detail closes. */
export const movementLinkId = (movementId: string): string =>
  `movement-${movementId}`;

/** What a correction changes: that movement, or every one with its text too (6.3g). */
export const CORRECTION_SCOPE = {
  MOVEMENT: "movement",
  SIMILAR: "similar",
} as const;

/** What the detail's own block changes: a Nequi number made the user's, or a rule undone (6.3h). */
export const RULE_CHANGE = {
  MINE: "mine",
  UNDO_NUMBER: "undo_number",
  UNDO_TEXT: "undo_text",
} as const;

/** The category a kind starts on when the user chooses it: what it says when nothing more is known. */
export const DEFAULT_CATEGORY_OF_KIND = {
  spending: "other_spending",
  income: "other_income",
  internal: "own_account_transfer",
} as const satisfies Record<CategoryKind, CategoryId>;

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
  // A month's daily interest in one line: "Intereses de septiembre" with
  // "30 abonos diarios, agrupados en una línea.", and the page's subtitle,
  // "Los 90 abonos diarios de intereses se ven agrupados por mes."
  interest: {
    title: "Intereses de",
    abonos: { one: "abono diario", other: "abonos diarios" },
    inOneLine: "agrupados en una línea.",
    groupedBefore: "Los",
    groupedAfter: "abonos diarios de intereses se ven agrupados por mes.",
  },
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
    from: "Del",
    to: "al",
    ofYear: "de",
  },
  // A movement's detail (docs/ui/v8-03), and what its column says before
  // one is chosen. Its reasons follow "Por qué:" in lowercase, as the rules
  // write theirs.
  detail: {
    close: "Cerrar el detalle",
    bankText: "Así lo escribe el banco",
    channel: "Canal",
    reference: "Referencia",
    referenceDots: "•••",
    source: "Fuente",
    balanceAfter: "Saldo después",
    kind: "Tipo",
    kinds: { income: "Ingreso", spending: "Gasto real", internal: "Movido" },
    category: "Categoría",
    noCategory: "Sin categoría",
    why: "Por qué:",
    systemRule: "Regla del sistema, sin IA.",
    yours: "lo decidiste tú.",
    unknown: "ninguna regla conoce este movimiento todavía.",
    bestGuess: "Es nuestra mejor suposición: confírmala en la revisión.",
    toReview: "Ir a la revisión",
    // Its kind and category as choices (6.3g): "Aplicar a los 3 parecidos",
    // then "Listo: este movimiento cuenta como movido."
    save: "Guardar cambios",
    applyToOne: "Aplicar al parecido",
    applyToMany: { before: "Aplicar a los", after: "parecidos" },
    applyToNext: "Aplicar también a los próximos",
    kindWords: {
      income: "ingreso",
      spending: "gasto real",
      internal: "movido",
    },
    savedOne: "Listo: este movimiento cuenta como",
    savedSimilar: "Listo: los movimientos con este texto cuentan como",
    andNext: "también los próximos",
    failed: "No pudimos guardar el cambio. Vuelve a intentarlo.",
    // The user's Nequi number and their rule for its text, and undoing them
    // (6.3h): "Nequi ••• 1270", "Es mío", "Deshacer".
    nequi: "Nequi",
    numberUnknown:
      "¿Es tuyo? Lo que le envías y lo que llega de él contaría como movido.",
    numberMine:
      "Es tuyo: lo que le envías y lo que llega de él cuenta como movido.",
    numberTheirs: "Dijiste que no es tuyo.",
    markMine: "Es mío",
    undo: "Deshacer",
    textRule: "Tu regla para este texto",
    textRuleSays: "Los movimientos con este texto cuentan como",
    undoTextRule: "Deshacer tu regla para este texto",
    savedMine: "Listo: ese Nequi es tuyo.",
    undoneNumber: "Listo: deshicimos tu respuesta para ese Nequi.",
    undoneText: "Listo: deshicimos tu regla para este texto.",
    emptyTitle: "Elige un movimiento",
    emptyDescription:
      "Verás cómo lo escribe el banco, su canal, de qué archivo viene y por qué tiene su categoría.",
  },
} as const;
