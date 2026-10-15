import type { LucideIcon } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { COLORS, FONTS, KIND_COLORS } from "../theme/tokens";

// Status badges (design-system.md §9): borderless pills on a soft background.
const TONES = {
  ok: {
    background: KIND_COLORS.income.soft,
    color: KIND_COLORS.income.onSoft,
  },
  attention: {
    background: KIND_COLORS.spending.soft,
    color: KIND_COLORS.spending.onSoft,
  },
  info: { background: COLORS.primarySoft, color: COLORS.primaryStrong },
} satisfies Record<string, CSSProperties>;

type BadgeProps = {
  tone: keyof typeof TONES;
  icon?: LucideIcon;
  children: ReactNode;
};

export const Badge = ({ tone, icon: Icon, children }: BadgeProps) => (
  <span
    style={{
      ...TONES[tone],
      display: "inline-flex",
      alignItems: "center",
      gap: 4,
      padding: "2px 9px",
      borderRadius: 999,
      fontFamily: FONTS.ui,
      fontWeight: 600,
      fontSize: 12,
      whiteSpace: "nowrap",
    }}
  >
    {Icon && <Icon size={12} strokeWidth={2.2} />}
    {children}
  </span>
);

/** The channel a movement went through, from the bank's text (§9). */
export const ChannelTag = ({ children }: { children: ReactNode }) => (
  <span
    style={{
      display: "inline-block",
      padding: "1px 8px",
      borderRadius: 999,
      border: `1px solid ${COLORS.chartAxis}`,
      background: COLORS.surface,
      fontFamily: FONTS.ui,
      fontWeight: 600,
      fontSize: 11,
      color: COLORS.inkSecondary,
      whiteSpace: "nowrap",
    }}
  >
    {children}
  </span>
);
