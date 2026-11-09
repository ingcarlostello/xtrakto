// The Spanish copy of the email notices, in one place (project rules §5).

// "Avisos" in the profile (docs/ui/v8-11), with the notices that exist today.
export const NOTICES_COPY = {
  title: "Avisos",
  description: "Solo por correo. Nunca incluyen montos.",
  uploadReady: {
    label: "Cuando tu archivo esté listo",
    line: "Un correo con el resumen.",
  },
  failed: "No pudimos guardar el cambio. Intenta de nuevo.",
} as const;

// The page a notice's link opens: it says the same whatever the link holds.
export const UNSUBSCRIBE_COPY = {
  metaTitle: "Dejar de recibir este aviso",
  title: "¿Dejamos de enviarte este aviso?",
  line: "Solo apagamos este correo. Tus datos siguen igual.",
  action: "Dejar de recibirlo",
  done: {
    metaTitle: "Aviso apagado",
    title: "Listo, ya no te lo enviamos",
    line: "Puedes volver a encenderlo cuando quieras en tu perfil.",
    action: "Ir a mi perfil",
  },
} as const;

// The email of an upload's files: counts and a link, never a text of the
// bank, a name, an amount, an account's digits or a file's name.
export const UPLOAD_EMAIL_COPY = {
  subject: {
    ready: { one: "Tu archivo está listo", other: "Tus archivos están listos" },
    unread: {
      one: "No pudimos leer tu archivo",
      other: "No pudimos leer tus archivos",
    },
  },
  yourFile: "tu archivo",
  read: "Leímos",
  files: { one: "archivo", other: "archivos" },
  movements: { one: "movimiento nuevo", other: "movimientos nuevos" },
  saved: "y guardamos",
  hadThem: "Ya tenías todos sus movimientos.",
  failed: { one: "no se pudo leer.", other: "no se pudieron leer." },
  whatHappened: "Entra a Xtrakto para ver qué pasó y qué puedes hacer.",
  action: "Ver el resultado",
  footer:
    "Te escribimos porque subiste un archivo a Xtrakto. Este correo no incluye montos ni datos de tus movimientos.",
  unsubscribe: "Dejar de recibir este aviso",
} as const;

// The email's own colors: an email client reads no stylesheet (docs/brand.md).
export const EMAIL_STYLE = {
  background: "#EEF2F7",
  surface: "#FFFFFF",
  ink: "#1C2430",
  inkSecondary: "#3A4452",
  inkMuted: "#5F6B7A",
  primary: "#2563EB",
  font: "Arial, Helvetica, sans-serif",
} as const;
