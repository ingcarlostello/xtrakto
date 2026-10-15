import { cn } from "@/utils/cn.utils";

// design-system.md §3.5 and §9: the status dot, with its halo. The words say
// the status; the dot only repeats it.
const DOT_TONES = {
  ok: "bg-income ring-income/18",
  attention: "bg-spending ring-spending/18",
  // A file without balances to verify, such as a movements export.
  none: "bg-ink-faint ring-ink-faint/18",
} as const;

export type StatusTone = keyof typeof DOT_TONES;

type StatusPillProps = {
  tone: StatusTone;
  title: string;
  detail: string;
  className?: string;
};

/** A status in a white pill: a dot, what it is, and one line about it. */
export function StatusPill({
  tone,
  title,
  detail,
  className,
}: StatusPillProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-sm bg-surface px-3.5 py-2.5 shadow-chip",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn("size-2.5 shrink-0 rounded-full ring-4", DOT_TONES[tone])}
      />
      <div className="flex min-w-0 flex-col">
        <p className="text-sm font-bold">{title}</p>
        <p className="text-meta text-ink-muted">{detail}</p>
      </div>
    </div>
  );
}
