// The Spanish copy of the settings page, in one place (project rules §5).

export const SETTINGS_COPY = {
  title: "Configuración",
  subtitle: "Tus datos y tu cuenta.",
} as const;

/** How the export of every movement is named, before its date (7.6). */
export const MY_DATA_CSV_NAME = "xtrakto-mis-datos";

export const DOWNLOAD_DATA_COPY = {
  title: "Descargar tus datos",
  description:
    "Todos tus movimientos guardados, también los que no cuentan en tu resumen, en un archivo CSV que abres con Excel.",
  trigger: "Descargar mis datos (CSV)",
} as const;

export const DELETE_ACCOUNT_COPY = {
  title: "Eliminar tu cuenta y tus datos",
  description:
    "Borramos tus extractos, sus movimientos, tus cuentas y cualquier carga en proceso, y luego tu usuario. No se puede deshacer.",
  trigger: "Eliminar mi cuenta y mis datos",
  confirmTitle: "¿Eliminar tu cuenta y todos tus datos?",
  confirmDescription:
    "Se borran para siempre tus extractos, sus movimientos y tu usuario de Xtrakto. Si vuelves, empezarás desde cero.",
  cancel: "Cancelar",
  confirm: "Sí, eliminar todo",
  pending: "Eliminando…",
  failed: "No pudimos eliminar tu cuenta. Inténtalo de nuevo en unos minutos.",
  signedOut: "Tu sesión terminó. Vuelve a entrar para eliminar tu cuenta.",
} as const;
