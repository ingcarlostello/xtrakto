import { cn } from "cn";
import { useId } from "react";

// The "cinta plegada" mark on its 64 × 64 grid (docs/brand.md §3). The colors
// exist only inside the mark; the interface never uses them.
const GRADIENTS = [
  { key: "b", x1: 14, y1: 14, x2: 50, y2: 50, from: "#8CB8FF", to: "#1D4ED8" },
  { key: "o", x1: 50, y1: 14, x2: 32, y2: 32, from: "#FFB48A", to: "#EA6B2D" },
  { key: "f", x1: 32, y1: 32, x2: 14, y2: 50, from: "#A63E0B", to: "#E2581A" },
] as const;

// Below this size the detailed mark's blur turns to mud (docs/brand.md §5).
const DETAILED_MIN_SIZE = 40;

type MarkPartProps = { id: string; detailed: boolean };

function MarkDefs({ id, detailed }: MarkPartProps) {
  return (
    <defs>
      {GRADIENTS.map(({ key, from, to, ...line }) => (
        <linearGradient
          key={key}
          id={`${id}${key}`}
          gradientUnits="userSpaceOnUse"
          {...line}
        >
          <stop offset="0" stopColor={from} />
          <stop offset="1" stopColor={to} />
        </linearGradient>
      ))}
      {detailed && (
        <filter id={`${id}s`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2.2" />
        </filter>
      )}
    </defs>
  );
}

// Orange under blue, the orange folding at the center. The detailed version
// adds the blue bar's shadow and highlight.
function MarkBars({ id, detailed }: MarkPartProps) {
  return (
    <>
      <g strokeLinecap="round" strokeWidth="14">
        <line x1="50" y1="14" x2="32" y2="32" stroke={`url(#${id}o)`} />
        <line x1="32" y1="32" x2="14" y2="50" stroke={`url(#${id}f)`} />
        {detailed && (
          <line
            x1="15.5"
            y1="16.5"
            x2="51.5"
            y2="52.5"
            stroke="#0B1A3A"
            strokeOpacity=".35"
            filter={`url(#${id}s)`}
          />
        )}
        <line x1="14" y1="14" x2="50" y2="50" stroke={`url(#${id}b)`} />
      </g>
      {detailed && (
        <line
          x1="15"
          y1="10.5"
          x2="47"
          y2="42.5"
          stroke="#FFFFFF"
          strokeOpacity=".28"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      )}
    </>
  );
}

type LogoMarkProps = {
  /** Width and height in pixels. */
  size?: number;
  /** Defaults to the detailed mark from 40px up and the simple one below. */
  variant?: "detailed" | "simple";
  /** Set it when the mark stands alone; leave it out next to the wordmark. */
  title?: string;
  className?: string;
};

export function LogoMark({
  size = 32,
  variant,
  title,
  className,
}: LogoMarkProps) {
  // Unique ids, so several marks can share a page.
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const detailed =
    (variant ?? (size >= DETAILED_MIN_SIZE ? "detailed" : "simple")) ===
    "detailed";
  const a11y = title
    ? { role: "img", "aria-label": title }
    : { "aria-hidden": true };
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      {...a11y}
    >
      <MarkDefs id={id} detailed={detailed} />
      <MarkBars id={id} detailed={detailed} />
    </svg>
  );
}

type LogoProps = {
  /** Size of the mark in pixels; the wordmark scales with it. */
  size?: number;
  tone?: "ink" | "white";
  className?: string;
};

/**
 * The mark and the live wordmark, with the proportions of docs/brand.md §3.
 * The text is "Xtrakto" in uppercase, so screen readers say the name instead
 * of spelling it.
 */
export function Logo({ size = 32, tone = "ink", className }: LogoProps) {
  return (
    <span
      className={cn("inline-flex items-center", className)}
      style={{ gap: size * 0.26 }}
    >
      <LogoMark size={size} />
      <span
        className={cn(
          "mr-[-0.3em] font-display leading-none font-medium tracking-[0.3em] uppercase",
          tone === "white" ? "text-white" : "text-ink",
        )}
        style={{ fontSize: size * 0.45 }}
      >
        Xtrakto
      </span>
    </span>
  );
}
