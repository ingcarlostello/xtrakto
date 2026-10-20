const RADIUS = 26;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// Each kind's graphic color (design-system.md §3.4).
const STROKE = {
  income: "stroke-income",
  spending: "stroke-spending",
  moved: "stroke-moved",
} as const;

// The ring's track, or its share in percent from 12 o'clock with round caps.
function Circle({ className, share }: { className: string; share?: number }) {
  const arc =
    share === undefined
      ? {}
      : {
          strokeLinecap: "round" as const,
          strokeDasharray: CIRCUMFERENCE,
          strokeDashoffset: CIRCUMFERENCE * (1 - share / 100),
        };
  return (
    <circle
      cx="29"
      cy="29"
      r={RADIUS}
      fill="none"
      strokeWidth="6"
      className={className}
      {...arc}
    />
  );
}

/**
 * A share as a ring (design-system.md §9, stat card): 58px, its track, its
 * part in the kind's color, and its percentage inside, which the green one
 * always needs (§3.6). Hidden from screen readers: the card's words say the
 * share.
 */
export function ProgressRing({
  percent,
  tone,
}: {
  percent: number;
  tone: keyof typeof STROKE;
}) {
  const share = Math.min(Math.max(percent, 0), 100);
  return (
    <span
      aria-hidden
      className="relative flex size-[58px] shrink-0 items-center justify-center"
    >
      <svg viewBox="0 0 58 58" className="absolute inset-0 -rotate-90">
        <Circle className="stroke-ring-track" />
        {/* A round cap would draw a dot for nothing. */}
        {share > 0 && <Circle className={STROKE[tone]} share={share} />}
      </svg>
      <span className="relative font-display text-sm font-medium tabular-nums">
        {percent}%
      </span>
    </span>
  );
}
