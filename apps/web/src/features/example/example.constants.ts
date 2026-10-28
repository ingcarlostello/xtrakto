// The Spanish copy of the example (7.8), in one place (project rules §5).
// v8 draws only its two ways in (v8-12, v8-17): the banner and the read-only
// note are built from v8's pieces.

export const EXAMPLE_COPY = {
  // "Ver con datos de ejemplo" on the empty summary, "Explorar con datos de
  // ejemplo" on the welcome's last step.
  open: {
    summary: "Ver con datos de ejemplo",
    welcome: "Explorar con datos de ejemplo",
  },
  opening: "Abriendo el ejemplo…",
  failed: "No pudimos abrir el ejemplo. Inténtalo de nuevo en unos minutos.",
  invite: {
    title: "¿No los tienes a mano?",
    description: "Mira cómo se ve con un extracto de ejemplo.",
  },
  banner: {
    title: "Estás viendo un ejemplo",
    description:
      "Una cuenta de ahorros inventada, de julio a septiembre de 2026, para que veas cómo funciona Xtrakto. Nada de lo que hagas aquí se guarda.",
    leave: "Volver a mis datos",
  },
  readOnly: "Es un ejemplo: aquí no se guardan cambios.",
} as const;
