import { interpolate } from "remotion";

// The "cinta plegada" mark on its 64 × 64 grid (docs/brand.md §3): the orange
// bar draws and folds, then the blue one crosses over it. Its colors exist
// only inside the mark.
const GRADIENTS = [
  {
    id: "xv-b",
    x1: 14,
    y1: 14,
    x2: 50,
    y2: 50,
    from: "#8CB8FF",
    to: "#1D4ED8",
  },
  {
    id: "xv-o",
    x1: 50,
    y1: 14,
    x2: 32,
    y2: 32,
    from: "#FFB48A",
    to: "#EA6B2D",
  },
  {
    id: "xv-f",
    x1: 32,
    y1: 32,
    x2: 14,
    y2: 50,
    from: "#A63E0B",
    to: "#E2581A",
  },
] as const;

/** The orange bar and its fold, each with its part (0 to 1) of the drawing. */
const ORANGE_BARS = [
  {
    id: "top",
    x1: 50,
    y1: 14,
    x2: 32,
    y2: 32,
    stroke: "url(#xv-o)",
    from: 0,
    to: 0.3,
  },
  {
    id: "fold",
    x1: 32,
    y1: 32,
    x2: 14,
    y2: 50,
    stroke: "url(#xv-f)",
    from: 0.3,
    to: 0.6,
  },
] as const;
const BLUE_BAR = {
  x1: 14,
  y1: 14,
  x2: 50,
  y2: 50,
  stroke: "url(#xv-b)",
} as const;
const BLUE_SHADOW = {
  x1: 15.5,
  y1: 16.5,
  x2: 51.5,
  y2: 52.5,
  stroke: "#0B1A3A",
} as const;
const HIGHLIGHT = {
  x1: 15,
  y1: 10.5,
  x2: 47,
  y2: 42.5,
  stroke: "#FFFFFF",
} as const;

const stretch = (drawn: number, from: number, to: number) =>
  interpolate(drawn, [from, to], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

/** A bar drawn from its first point: `pathLength` makes 1 its whole length. */
const drawnBar = (shown: number) => ({
  pathLength: 1,
  strokeDasharray: "1 1",
  strokeDashoffset: 1 - shown,
  opacity: shown > 0 ? 1 : 0,
});

const MarkDefs = () => (
  <defs>
    {GRADIENTS.map(({ id, from, to, ...line }) => (
      <linearGradient key={id} id={id} gradientUnits="userSpaceOnUse" {...line}>
        <stop offset="0" stopColor={from} />
        <stop offset="1" stopColor={to} />
      </linearGradient>
    ))}
    <filter id="xv-s" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="2.2" />
    </filter>
  </defs>
);

type LogoMarkProps = { size: number; drawn: number };

export const LogoMark = ({ size, drawn }: LogoMarkProps) => {
  const blue = stretch(drawn, 0.5, 1);
  return (
    <svg viewBox="0 0 64 64" width={size} height={size}>
      <MarkDefs />
      <g strokeLinecap="round" strokeWidth="14">
        {ORANGE_BARS.map(({ id, from, to, ...line }) => (
          <line key={id} {...line} {...drawnBar(stretch(drawn, from, to))} />
        ))}
        <line
          {...BLUE_SHADOW}
          strokeOpacity={0.35 * blue}
          filter="url(#xv-s)"
        />
        <line {...BLUE_BAR} {...drawnBar(blue)} />
      </g>
      <line
        {...HIGHLIGHT}
        strokeOpacity={0.28 * blue}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
};
