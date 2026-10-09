// What the development page shows. Values live only in globals.css; the page
// renders each token through its CSS variable.

export const COLOR_GROUPS = [
  {
    title: "Superficies",
    tokens: ["bg", "surface", "surface-muted", "divider", "chart-grid"],
  },
  {
    title: "Texto",
    tokens: ["ink", "ink-secondary", "ink-muted", "ink-faint"],
  },
  {
    title: "Primario",
    tokens: ["primary", "primary-strong", "primary-soft", "primary-soft-2"],
  },
  {
    title: "Ingresos",
    tokens: ["income", "income-text", "income-soft", "income-on-soft"],
  },
  {
    title: "Gasto real",
    tokens: [
      "spending",
      "spending-text",
      "spending-soft",
      "spending-on-soft",
      "spending-surface",
    ],
  },
  {
    title: "Movido",
    tokens: ["moved", "moved-text", "moved-soft", "moved-on-soft"],
  },
  { title: "Peligro", tokens: ["danger"] },
] as const;

// The text pairs of design-system.md §3.6 that pass WCAG AA, plus danger.
export const CONTRAST_PAIRS = [
  { text: "ink", background: "surface" },
  { text: "ink-secondary", background: "surface" },
  { text: "ink-muted", background: "surface" },
  { text: "ink-muted", background: "bg" },
  { text: "primary", background: "surface" },
  { text: "primary-strong", background: "primary-soft" },
  { text: "income-text", background: "surface" },
  { text: "income-on-soft", background: "income-soft" },
  { text: "spending-text", background: "surface" },
  { text: "spending-on-soft", background: "spending-soft" },
  { text: "danger", background: "surface" },
  { text: "danger", background: "bg" },
] as const;

export const TYPE_SAMPLES = [
  {
    name: "title",
    className: "font-display text-title font-medium",
    text: "Resumen de tu cuenta de ahorros",
  },
  {
    name: "amount-xl",
    className: "font-display text-amount-xl font-medium tabular-nums",
    text: "$6.482.310",
  },
  {
    name: "amount-l",
    className: "font-display text-amount-l font-medium tabular-nums",
    text: "$4,62M",
  },
  {
    name: "amount-m",
    className: "font-display text-amount-m font-medium tabular-nums",
    text: "$3.150.000",
  },
  {
    name: "section",
    className: "text-section font-bold",
    text: "Tu trimestre de un vistazo",
  },
  {
    name: "body",
    className: "text-body font-medium text-ink-secondary",
    text: "Comparamos cada saldo con el de tu banco.",
  },
  {
    name: "caption",
    className: "text-caption text-ink-muted",
    text: "El 45% de lo que salió. Compras, créditos, efectivo y pagos a personas.",
  },
  {
    name: "meta",
    className: "text-meta tracking-[0.02em] text-ink-muted",
    text: "PAGO PSE CREDITO CONSUMO",
  },
] as const;

export const RADII = ["sm", "bubble", "md", "lg", "xl"] as const;

export const SHADOWS = [
  "card",
  "panel",
  "float",
  "pop",
  "chip",
  "primary",
  "assistant",
] as const;
