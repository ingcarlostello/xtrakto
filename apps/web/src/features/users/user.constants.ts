// The Spanish copy of the profile page, in one place (project rules §5).

export const PROFILE_COPY = {
  title: "Tu perfil",
  subtitle: "Tus datos y tu privacidad.",
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
