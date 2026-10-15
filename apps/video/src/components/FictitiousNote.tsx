import { useCurrentFrame } from "remotion";
import { progress } from "../animation/animation.helpers";
import { useIsPortrait } from "../layout/use-is-portrait";
import { COLORS, FONTS, SHADOWS } from "../theme/tokens";

/** Every number on screen is invented: the video says so while they show. */
export const FictitiousNote = ({ until }: { until: number }) => {
  const frame = useCurrentFrame();
  const isPortrait = useIsPortrait();
  const opacity =
    progress(frame, 10, 14) * (1 - progress(frame, until - 18, 14));
  return (
    <div
      style={{
        position: "absolute",
        bottom: isPortrait ? 70 : 52,
        left: isPortrait ? "50%" : 120,
        translate: isPortrait ? "-50% 0" : undefined,
        padding: "10px 22px",
        borderRadius: 999,
        background: "rgb(255 255 255 / 0.8)",
        boxShadow: SHADOWS.chip,
        fontFamily: FONTS.ui,
        fontWeight: 600,
        fontSize: isPortrait ? 28 : 24,
        color: COLORS.inkSecondary,
        whiteSpace: "nowrap",
        opacity,
      }}
    >
      Ejemplo con datos ficticios
    </div>
  );
};
