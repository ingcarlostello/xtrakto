import type { MappingTest } from "@xtrakto/parsers";
import { StatusPill } from "@/components/status-pill/StatusPill";
import { cn } from "@/utils/cn.utils";
import { CONFIRMATION_COPY as COPY } from "../format-confirmation.constants";
import {
  readText,
  testLines,
  testVerdict,
} from "../format-confirmation.helpers";
import type { TestLine } from "../format-confirmation.helpers";

const TONES = {
  income: "text-income-text",
  spending: "text-spending-text",
} as const;

function Line({ line, isTotal }: { line: TestLine; isTotal?: boolean }) {
  return (
    <div
      className={cn(
        "flex items-baseline justify-between gap-4",
        isTotal && "border-t border-divider pt-3",
      )}
    >
      <dt
        className={cn("text-sm", isTotal ? "font-bold" : "text-ink-secondary")}
      >
        {line.label}
      </dt>
      <dd
        className={cn(
          "font-display text-body font-medium tabular-nums",
          line.tone && TONES[line.tone],
        )}
      >
        {line.amount}
      </dd>
    </div>
  );
}

/**
 * "Prueba con tu archivo" (v8-14): how many movements the mapping reads,
 * what came in and went out, and, when the file prints balances, whether its
 * closing balance adds up. The page works it out; the AI does no sums.
 */
export function ReadingTest({ test }: { test: MappingTest }) {
  const { ways, closing } = testLines(test);
  const verdict = testVerdict(test);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-section font-bold">{COPY.test.title}</h2>
        <p className="text-caption text-ink-muted">{readText(test)}</p>
      </div>
      <dl className="flex flex-col gap-2.5">
        {ways.map((line) => (
          <Line key={line.label} line={line} />
        ))}
        {closing && <Line line={closing} isTotal />}
      </dl>
      <StatusPill
        tone={verdict.tone}
        title={verdict.title}
        detail={verdict.detail}
        className="w-full"
      />
    </div>
  );
}
