import type { CSSProperties, ReactNode } from "react";
import { COLORS, FONTS, RADII, SHADOWS } from "../theme/tokens";

type CardProps = { children: ReactNode; style?: CSSProperties };

/** A translucent card without borders (design-system.md §5 and §6). */
export const Card = ({ children, style }: CardProps) => (
  <div
    style={{
      background: COLORS.surfaceCard,
      borderRadius: RADII.lg,
      boxShadow: SHADOWS.card,
      padding: 20,
      fontFamily: FONTS.ui,
      color: COLORS.ink,
      ...style,
    }}
  >
    {children}
  </div>
);

type CardHeaderProps = { title: string; detail: string };

export const CardHeader = ({ title, detail }: CardHeaderProps) => (
  <div style={{ marginBottom: 6 }}>
    <div style={{ fontWeight: 700, fontSize: 16 }}>{title}</div>
    <div style={{ fontSize: 13, color: COLORS.inkMuted }}>{detail}</div>
  </div>
);
