import { useId } from "react";

// The statement seen from above, the brand illustration of
// design-system.md §2: a light body, a dark glass panel with text lines and
// one highlighted row in blue, and an orange bar. Decorative only.

const TEXT_LINES = [
  { y: 36, width: 58 },
  { y: 46, width: 44 },
  { y: 74, width: 52 },
  { y: 84, width: 36 },
  { y: 94, width: 48 },
] as const;

// The top notch, the highlighted row, the orange bar and the bottom line.
const DETAILS = [
  { x: 44, y: 11, width: 24, height: 4, rx: 2, fill: "#C8D2DE" },
  { x: 20, y: 57, width: 72, height: 14, rx: 7, fill: "#4C8DF6" },
  { x: 22, y: 120, width: 68, height: 5, rx: 2.5, fill: "#EA6B2D" },
  { x: 34, y: 136, width: 44, height: 4, rx: 2, fill: "#C8D2DE" },
] as const;

function Gradients({ id }: { id: string }) {
  return (
    <defs>
      <linearGradient id={`${id}body`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#FFFFFF" />
        <stop offset="1" stopColor="#D5DDE8" />
      </linearGradient>
      <linearGradient id={`${id}glass`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#2D3846" />
        <stop offset="1" stopColor="#0F151D" />
      </linearGradient>
    </defs>
  );
}

export function StatementIllustration({ className }: { className?: string }) {
  // Unique gradient ids, so several illustrations can share a page.
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  return (
    <svg viewBox="0 0 112 160" className={className} aria-hidden>
      <Gradients id={id} />
      <rect
        x="2"
        y="2"
        width="108"
        height="156"
        rx="27"
        stroke="#C8D2DE"
        fill={`url(#${id}body)`}
      />
      <rect
        x="12"
        y="24"
        width="88"
        height="86"
        rx="18"
        fill={`url(#${id}glass)`}
      />
      {TEXT_LINES.map(({ y, width }) => (
        <rect
          key={y}
          x="22"
          y={y}
          width={width}
          height="4"
          rx="2"
          fill="#FFFFFF"
          fillOpacity=".22"
        />
      ))}
      {DETAILS.map((detail) => (
        <rect key={`${detail.x}-${detail.y}`} {...detail} />
      ))}
    </svg>
  );
}
