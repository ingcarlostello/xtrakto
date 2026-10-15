import type { LucideIcon } from "lucide-react";
import type { CSSProperties } from "react";
import { COLORS, KIND_COLORS, type Kind } from "../theme/tokens";

const DOT: CSSProperties = {
  position: "absolute",
  top: 0,
  right: 0,
  width: 9,
  height: 9,
  borderRadius: "50%",
  background: COLORS.statusAttention,
};

type IconChipProps = {
  icon: LucideIcon;
  /** The kind's soft background; neutral without one (§3.4). */
  kind?: Kind;
  size?: number;
  /** A white chip with the 9px orange dot: something to look at (§9). */
  hasDot?: boolean;
};

export const IconChip = ({
  icon: Icon,
  kind,
  size = 44,
  hasDot = false,
}: IconChipProps) => {
  const colors = kind ? KIND_COLORS[kind] : undefined;
  return (
    <div
      style={{
        position: "relative",
        flex: `0 0 ${size}px`,
        height: size,
        borderRadius: "50%",
        display: "grid",
        placeItems: "center",
        background: hasDot
          ? COLORS.surface
          : (colors?.soft ?? COLORS.surfaceMuted),
      }}
    >
      <Icon
        size={Math.round(size * 0.45)}
        strokeWidth={colors ? 1.9 : 1.7}
        color={colors?.text ?? COLORS.ink}
      />
      {hasDot && <span style={DOT} />}
    </div>
  );
};
