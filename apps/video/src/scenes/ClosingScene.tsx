import { AbsoluteFill, useCurrentFrame } from "remotion";
import { enter, progress } from "../animation/animation.helpers";
import { Background } from "../components/Background";
import { LogoMark } from "../components/LogoMark";
import { BEATS } from "../promo/promo.constants";
import { useIsPortrait } from "../layout/use-is-portrait";
import { COLORS, FONTS, SHADOWS } from "../theme/tokens";

/** The wordmark (docs/brand.md): its letters close in as it appears. */
const Wordmark = ({ size }: { size: number }) => {
  const frame = useCurrentFrame();
  const shown = progress(frame, 30, 26);
  return (
    <div
      style={{
        fontFamily: FONTS.display,
        fontWeight: 500,
        fontSize: size,
        letterSpacing: `${0.3 + 0.25 * (1 - shown)}em`,
        marginRight: "-0.3em",
        color: COLORS.ink,
        opacity: shown,
      }}
    >
      XTRAKTO
    </div>
  );
};

/** The waitlist, as the landing page asks for it. */
const CallToAction = ({ scale }: { scale: number }) => {
  const frame = useCurrentFrame();
  const pill = {
    borderRadius: 999,
    fontFamily: FONTS.ui,
    fontWeight: 700,
  } as const;
  return (
    <div style={{ display: "grid", justifyItems: "center", gap: 22 * scale }}>
      <div
        style={{
          ...pill,
          ...enter(frame, BEATS.callToAction - 10),
          padding: `${10 * scale}px ${26 * scale}px`,
          background: COLORS.primarySoft,
          color: COLORS.primaryStrong,
          fontSize: 28 * scale,
        }}
      >
        Muy pronto
      </div>
      <div
        style={{
          ...pill,
          ...enter(frame, BEATS.callToAction),
          padding: `${24 * scale}px ${52 * scale}px`,
          background: COLORS.primary,
          boxShadow: SHADOWS.primary,
          color: COLORS.surface,
          fontSize: 40 * scale,
        }}
      >
        Entra a la lista de espera
      </div>
    </div>
  );
};

/** The tagline (docs/brand.md), under the wordmark. */
const Tagline = ({ scale }: { scale: number }) => {
  const frame = useCurrentFrame();
  return (
    <div
      style={{
        ...enter(frame, 50),
        fontFamily: FONTS.ui,
        fontWeight: 500,
        fontSize: 38 * scale,
        color: COLORS.inkSecondary,
        marginBottom: 30 * scale,
      }}
    >
      Cuentas claras, mente tranquila
    </div>
  );
};

export const ClosingScene = () => {
  const frame = useCurrentFrame();
  const scale = useIsPortrait() ? 1.1 : 1;
  return (
    <AbsoluteFill>
      <Background />
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          gap: 26 * scale,
        }}
      >
        <LogoMark size={190 * scale} drawn={progress(frame, 6, 34)} />
        <Wordmark size={76 * scale} />
        <Tagline scale={scale} />
        <CallToAction scale={scale} />
        <div
          style={{
            ...enter(frame, BEATS.callToAction + 12),
            fontFamily: FONTS.display,
            fontWeight: 500,
            fontSize: 48 * scale,
            color: COLORS.ink,
          }}
        >
          xtrakto.site
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
