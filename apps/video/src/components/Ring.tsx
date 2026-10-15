import { COLORS, FONTS, KIND_COLORS, type Kind } from "../theme/tokens";

// The stat card's progress ring (design-system.md §9): 58px, radius 26,
// stroke 6, starting at 12 o'clock, its percentage in the center.
const RADIUS = 26;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

type RingProps = {
  percent: number;
  kind: Kind;
  /** How much of the ring is drawn, from 0 to 1. */
  shown: number;
};

export const Ring = ({ percent, kind, shown }: RingProps) => (
  <svg width={58} height={58} viewBox="0 0 58 58">
    <circle
      cx={29}
      cy={29}
      r={RADIUS}
      fill="none"
      stroke={COLORS.ringTrack}
      strokeWidth={6}
    />
    <circle
      cx={29}
      cy={29}
      r={RADIUS}
      fill="none"
      stroke={KIND_COLORS[kind].graphic}
      strokeWidth={6}
      strokeLinecap="round"
      strokeDasharray={CIRCUMFERENCE}
      strokeDashoffset={CIRCUMFERENCE * (1 - (percent / 100) * shown)}
      transform="rotate(-90 29 29)"
      opacity={shown > 0 ? 1 : 0}
    />
    <text
      x={29}
      y={30}
      textAnchor="middle"
      dominantBaseline="central"
      fill={COLORS.ink}
      style={{ fontFamily: FONTS.display, fontWeight: 500, fontSize: 14 }}
    >
      {Math.round(percent * shown)}%
    </text>
  </svg>
);
