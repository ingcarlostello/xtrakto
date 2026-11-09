// The Spanish copy of the email notices, in one place (project rules §5).

// "Avisos" in the profile (docs/ui/v8-11), with the notices that exist today.
export const NOTICES_COPY = {
  title: "Avisos",
  description: "Solo por correo. Nunca incluyen montos.",
  uploadReady: {
    label: "Cuando tu archivo esté listo",
    line: "Un correo con el resumen.",
  },
  reviewWaiting: {
    label: "Si hay algo por revisar",
    line: "Grupos nuevos de movimientos sin clasificar.",
  },
  fixedPaymentRose: {
    label: "Si un pago fijo sube",
    line: "Te avisamos al subir el extracto.",
  },
  monthlySummary: {
    label: "Resumen del mes",
    line: "El primer día de cada mes.",
  },
  failed: "No pudimos guardar el cambio. Intenta de nuevo.",
} as const;

// The page a notice's link opens: it says the same whatever the link holds.
export const UNSUBSCRIBE_COPY = {
  metaTitle: "Dejar de recibir estos avisos",
  title: "¿Dejamos de enviarte estos avisos?",
  line: "Solo apagamos los avisos de este correo. Tus datos siguen igual.",
  action: "Dejar de recibirlos",
  done: {
    metaTitle: "Avisos apagados",
    title: "Listo, ya no te los enviamos",
    line: "Puedes volver a encenderlos cuando quieras en tu perfil.",
    action: "Ir a mi perfil",
  },
} as const;

// The email of an upload: counts and links, never a text of the bank, a
// name, an amount, an account's digits or a file's name.
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
  // "2 pagos fijos subieron", without which or by how much.
  risen: {
    title: { one: "Un pago fijo subió", other: "pagos fijos subieron" },
    line: {
      one: "Entra a Pagos fijos para ver cuál y cuánto.",
      other: "Entra a Pagos fijos para ver cuáles y cuánto.",
    },
    action: "Ver mis pagos fijos",
  },
  footer:
    "Te escribimos porque subiste un archivo a Xtrakto. Este correo no incluye montos ni datos de tus movimientos.",
  unsubscribe: {
    one: "Dejar de recibir este aviso",
    other: "Dejar de recibir estos avisos",
  },
} as const;

// The first of the month's email (10.5): the month's summary, or which file
// it needs. Never an amount, a bank's text or a name either.
export const MONTHLY_EMAIL_COPY = {
  ready: {
    // "Tu resumen de octubre está listo".
    title: "Tu resumen de",
    isReady: "está listo",
    line: "Mira en qué gastaste, qué solo moviste y cuánto entró.",
    action: "Ver mi resumen",
  },
  // A month without movements: "Te falta octubre".
  missing: {
    title: "Te falta",
    toSee: "Para ver tu resumen del mes, sube",
  },
  // A month that doesn't reach its last day.
  partial: {
    title: "Te falta parte de",
    toSee: "Para ver el mes completo, sube",
  },
  footer:
    "Te escribimos porque activaste el resumen del mes en Xtrakto. Este correo no incluye montos ni datos de tus movimientos.",
} as const;

// The email's own colors: an email client reads no stylesheet (docs/brand.md).
export const EMAIL_STYLE = {
  background: "#EEF2F7",
  surface: "#FFFFFF",
  ink: "#1C2430",
  inkSecondary: "#3A4452",
  inkMuted: "#5F6B7A",
  primary: "#2563EB",
  divider: "#EDF0F4",
  font: "Arial, Helvetica, sans-serif",
} as const;
