// The movements list of docs/ui/v8-03 within Phase 5.7a: each day with its
// balance, the bank's text as printed and signed amounts. Kinds and
// categories come with Stage 6, the period selector with 5.7b. The Spanish
// copy lives here, in one place (project rules §5).

/** How many movements the list adds each time ("Mostrar 30 más"). */
export const MOVEMENTS_STEP = 30;

/** The most the list shows at once, whatever the URL asks: about a year. */
export const MAX_MOVEMENTS_SHOWN = 2_000;

/** The attribute that marks each movement's row, to focus the new ones. */
export const MOVEMENT_ROW_ATTRIBUTE = "data-movement";

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
  shown: { before: "Mostrando", of: "de" },
  more: { before: "Mostrar", after: "más" },
  // The period selector (docs/ui/v8-03), without "Año" until Phase 10.2.
  period: {
    quarter: "Trimestre",
    months: "Mes del trimestre",
    verified: "Verificado",
    unverified: "Sin verificar",
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
