// The app's design tokens (.claude/rules/design-system.md §3 to §6, the same
// values as apps/web/src/app/globals.css), for the video's inline styles.

export const COLORS = {
  surface: "#ffffff",
  surfaceCard: "rgb(255 255 255 / 0.88)",
  surfaceMuted: "#f1f4f8",
  divider: "#edf0f4",
  chartAxis: "#d6dce4",
  ringTrack: "#e3e8ef",
  ink: "#1c2430",
  inkSecondary: "#3a4452",
  inkMuted: "#5f6b7a",
  primary: "#2563eb",
  primaryStrong: "#1d4ed8",
  primarySoft: "#e3edfe",
  attentionSurface: "#fff6ef",
  statusOk: "#34b873",
  statusAttention: "#ea6b2d",
  silhouette: "#c9d6e6",
} as const;

/** Income, real spending and money that moved: color is meaning (§3.4). */
export const KIND_COLORS = {
  income: {
    graphic: "#34b873",
    text: "#15803d",
    soft: "#e3f6ec",
    onSoft: "#166534",
  },
  spending: {
    graphic: "#ea6b2d",
    text: "#c2410c",
    soft: "#fdeee4",
    onSoft: "#9a3412",
  },
  moved: {
    graphic: "#4c8df6",
    text: "#2563eb",
    soft: "#e3edfe",
    onSoft: "#1d4ed8",
  },
} as const;

export type Kind = keyof typeof KIND_COLORS;

export const BACKGROUND =
  "linear-gradient(180deg, #eef2f7 0%, #e9eef4 55%, #e2e8f0 100%)";

/** Bars of real spending (§3.4). */
export const SPENDING_GRADIENT = "linear-gradient(90deg, #f59e5b, #ea6b2d)";

export const SHADOWS = {
  card: "0 8px 22px rgb(80 98 125 / 0.08)",
  panel: "0 18px 44px rgb(80 98 125 / 0.12)",
  chip: "0 6px 16px rgb(80 98 125 / 0.12)",
  primary: "0 10px 24px rgb(37 99 235 / 0.28)",
} as const;

export const RADII = { sm: 16, md: 22, lg: 26, pill: 999 } as const;

export const FONTS = {
  display: "Outfit, system-ui, sans-serif",
  ui: "Manrope, 'Segoe UI', system-ui, sans-serif",
  mono: "ui-monospace, 'SF Mono', Menlo, Consolas, monospace",
} as const;
