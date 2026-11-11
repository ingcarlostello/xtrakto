// A file no parser knows on the upload screen (11.3a): its row's words while
// its format is settled, and why it couldn't be.

/** Why a file's format wasn't settled: what the LLM couldn't do, or what its roles made. */
export const FORMAT_PROBLEM = {
  AI_OFF: "ai_off",
  USER_MONTH: "ai_user_month",
  PLATFORM_BUDGET: "ai_platform_budget",
  AI_FAILED: "ai_failed",
  NOT_READ: "roles_not_read",
} as const;

export const UNKNOWN_FORMAT_COPY = {
  finding: "Buscando cómo leer este formato…",
  proposing: "Formato nuevo: estamos entendiendo sus columnas…",
  confirming: "Formato nuevo: confirma cómo leerlo.",
  confirmed: "Leyendo con el formato que confirmaste…",
} as const;

// What happened and what to do, without apologizing (design-system.md §11).
export const FORMAT_PROBLEM_COPY = {
  [FORMAT_PROBLEM.AI_OFF]: {
    title: "Aún no podemos leer este formato",
    detail:
      "No conocemos este banco y ahora no podemos proponer cómo leerlo. Vuelve a intentarlo más tarde.",
  },
  [FORMAT_PROBLEM.USER_MONTH]: {
    title: "Este mes ya usaste la IA de tu plan",
    detail:
      "Con ella proponemos cómo leer un banco nuevo. Vuelve a subirlo el próximo mes.",
  },
  [FORMAT_PROBLEM.PLATFORM_BUDGET]: {
    title: "Este mes ya no podemos leer bancos nuevos",
    detail: "Vuelve a subirlo el próximo mes.",
  },
  [FORMAT_PROBLEM.AI_FAILED]: {
    title: "No pudimos entender este formato",
    detail: "Vuelve a elegirlo en un momento.",
  },
  [FORMAT_PROBLEM.NOT_READ]: {
    title: "No entendimos las columnas de este archivo",
    detail:
      "Revisa que sea el archivo de movimientos que descargaste de tu banco, sin editar.",
  },
} as const;
