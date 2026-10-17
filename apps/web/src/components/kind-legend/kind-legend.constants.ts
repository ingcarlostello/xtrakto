/** The color legend of every screen that shows kinds (design-system.md §9). */
export const KIND_LEGEND = [
  { tone: "income", label: "Ingresos", meaning: "lo que entró de otros" },
  {
    tone: "spending",
    label: "Gasto real",
    meaning: "lo que de verdad gastaste",
  },
  {
    tone: "moved",
    label: "Movido",
    meaning:
      "lo que pasó entre tus cuentas, tu inversión o tus tarjetas, en cualquier sentido",
  },
] as const;

export const KIND_LEGEND_LABEL = "Qué significa cada color";
