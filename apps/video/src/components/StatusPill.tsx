import type { CSSProperties } from "react";
import { COLORS, FONTS, RADII, SHADOWS } from "../theme/tokens";

type StatusPillProps = { title: string; detail: string; style?: CSSProperties };

/** A verified file's pill (design-system.md §9): green dot with its halo. */
export const StatusPill = ({ title, detail, style }: StatusPillProps) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 10,
      padding: "10px 14px",
      background: COLORS.surface,
      borderRadius: RADII.sm,
      boxShadow: SHADOWS.chip,
      fontFamily: FONTS.ui,
      ...style,
    }}
  >
    <span
      style={{
        width: 10,
        height: 10,
        borderRadius: "50%",
        background: COLORS.statusOk,
        boxShadow: "0 0 0 4px rgb(52 184 115 / 0.18)",
      }}
    />
    <span>
      <span style={{ display: "block", fontWeight: 700, fontSize: 14 }}>
        {title}
      </span>
      <span style={{ fontSize: 12, color: COLORS.inkMuted }}>{detail}</span>
    </span>
  </div>
);
