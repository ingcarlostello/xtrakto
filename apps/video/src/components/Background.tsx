import { AbsoluteFill } from "remotion";
import { BACKGROUND, COLORS } from "../theme/tokens";

// The balance silhouette (design-system.md §2): a balance curve drawn as a
// faint mountain range at the bottom of the frame.
const SILHOUETTE =
  "M0 120 L0 74 C60 64 100 34 160 46 S260 84 320 60 S430 14 500 38 S620 74 700 52 S820 24 900 44 S980 66 1000 58 L1000 120 Z";

export const Background = () => (
  <AbsoluteFill style={{ background: BACKGROUND }}>
    <svg
      viewBox="0 0 1000 120"
      preserveAspectRatio="none"
      style={{ position: "absolute", bottom: 0, width: "100%", height: 200 }}
    >
      <path d={SILHOUETTE} fill={COLORS.silhouette} fillOpacity={0.4} />
    </svg>
  </AbsoluteFill>
);
