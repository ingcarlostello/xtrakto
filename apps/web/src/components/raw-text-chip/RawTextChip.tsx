import { countText } from "@/utils/count-text.utils";
import { RAW_TEXT_TIMES } from "./raw-text-chip.constants";

type RawTextChipProps = {
  /** The bank's text, exactly as it printed it. */
  text: string;
  /** How many movements carry it, shown as "×3". */
  count?: number;
};

/**
 * The bank's text as printed, double spaces included, in monospace, and how
 * often it repeats (design-system.md §9, raw-text chip). A text that doesn't
 * fit, such as a long holder's name on a phone, wraps.
 */
export function RawTextChip({ text, count }: RawTextChipProps) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5">
      <span className="min-w-0 rounded-[8px] border border-ring-track bg-surface px-2.5 py-1 font-mono text-meta break-words whitespace-pre-wrap text-ink-muted">
        {text}
      </span>
      {count !== undefined && (
        <>
          <span aria-hidden className="text-meta text-ink-muted">
            ×{count}
          </span>
          <span className="sr-only">{countText(count, RAW_TEXT_TIMES)}</span>
        </>
      )}
    </span>
  );
}
