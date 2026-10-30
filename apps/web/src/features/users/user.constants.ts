// The Spanish copy of the profile page, in one place (project rules §5).

export const PROFILE_COPY = {
  title: "Tu perfil",
  subtitle: "Tus datos, tus cuentas y tu privacidad.",
} as const;

// "Cómo te escribe el banco" (docs/ui/v8-11), without adding another way the
// name appears: a movement's detail does that (6.3g).
export const BANK_NAME_COPY = {
  title: "Cómo te escribe el banco",
  description:
    "Lo tomamos de tu extracto. Lo usamos para reconocer transferencias entre tus cuentas.",
  holder: "Titular",
  texts: "En tus transferencias aparece así",
  none: "Lo tomamos de tu extracto trimestral, que trae tu nombre como lo escribe el banco. Cuando lo subas, aparece aquí.",
} as const;

// "Tus cuentas y lo que es tuyo" (docs/ui/v8-11), without adding a
// reference: the quick review and a movement's detail do that (6.3).
export const YOURS_COPY = {
  title: "Tus cuentas y lo que es tuyo",
  description: "Así no contamos dos veces la plata que solo cambia de lugar.",
  identified: "Detectada en tu extracto.",
  unidentified: "Creada con tu archivo de movimientos.",
  // "Nequi · ref ••• 1270".
  number: "Nequi · ref •••",
  numberLine:
    "Lo que envías a este número y lo que llega de él cuenta como movido.",
  // "PAGO PSE NU COMPANIA DE FINA: pago de tarjeta de crédito, movido."
  moved: "movido",
  isMine: { number: "Es mío", text: "Es mía" },
  // "Ya no es mío: Nequi terminado en 1270".
  notMine: {
    number: "Ya no es mío: Nequi terminado en",
    text: "Ya no es mía:",
  },
  noAccounts: "Cuando subas tu primer extracto, aquí aparece tu cuenta.",
  noRules:
    "Lo que marques como tuyo en la revisión o en Movimientos aparece aquí: tus números de Nequi, tus tarjetas, tu inversión.",
  failed: "No pudimos quitarlo. Inténtalo de nuevo en unos minutos.",
} as const;

// "Tu cuenta en Xtrakto" (docs/ui/v8-11): who is signed in, and how.
export const ACCOUNT_COPY = {
  title: "Tu cuenta en Xtrakto",
  signsIn: {
    google: "Entras con Google",
    email: "Entras con tu correo",
  },
  manage: "Administrar inicio de sesión",
} as const;

// "Tu plan" (docs/ui/v8-11): only what works today, without v8's questions
// (Stage 13) or PDF pages (Stage 9).
export const PLAN_COPY = {
  title: "Tu plan",
  free: "Gratis",
  files: "Archivos este mes",
  // "3 de 10".
  of: "de",
  // "Se reinicia el 1 de noviembre."
  resetsOn: "Se reinicia el",
  // MAX_FILE_SIZE_BYTES, as the upload screen says it.
  fileSize: "Archivos de hasta 10 MB",
  // Only when the month's LLM calls ran out (8.3): "… esperan hasta el 1 de
  // noviembre."
  aiUsedUp:
    "Este mes ya usaste la IA de tu plan: los movimientos que ninguna regla conoce esperan hasta el",
} as const;

export const SESSION_COPY = {
  title: "Sesión",
  // "Último inicio de sesión: hoy, 8:42 a. m."
  lastSignIn: "Último inicio de sesión:",
  today: "hoy",
  yesterday: "ayer",
  signOut: "Cerrar sesión",
  signingOut: "Cerrando sesión…",
} as const;

/** How the export of every movement is named, before its date (7.6). */
export const MY_DATA_CSV_NAME = "xtrakto-mis-datos";

// "Privacidad y datos" (docs/ui/v8-11): what we keep and what we don't, true
// today, then the download and the deletion.
export const PRIVACY_AND_DATA_COPY = {
  title: "Privacidad y datos",
  facts: {
    files: {
      title: "No guardamos tus archivos",
      detail:
        "Se leen en tu navegador. Tampoco tu dirección ni el número completo de tu cuenta.",
    },
    phones: {
      title: "Teléfonos de terceros protegidos",
      detail:
        "Del número de un Nequi queda solo un código que no se puede revertir y sus últimos 4 dígitos.",
    },
    ads: {
      title: "Sin datos para publicidad",
      detail: "La analítica no incluye montos ni nombres.",
    },
  },
  download: "Descargar mis datos (CSV)",
  deletionNote: "Borra movimientos, reglas y tu cuenta. No se puede deshacer.",
} as const;

export const DELETE_ACCOUNT_COPY = {
  trigger: "Borrar todos mis datos",
  confirmTitle: "¿Borrar todos tus datos y tu cuenta?",
  confirmDescription:
    "Se borran para siempre tus extractos, sus movimientos, tus reglas y tu usuario de Xtrakto. Si vuelves, empezarás desde cero.",
  cancel: "Cancelar",
  confirm: "Sí, borrar todo",
  pending: "Borrando…",
  failed: "No pudimos borrar tus datos. Inténtalo de nuevo en unos minutos.",
  signedOut: "Tu sesión terminó. Vuelve a entrar para borrar tus datos.",
} as const;
