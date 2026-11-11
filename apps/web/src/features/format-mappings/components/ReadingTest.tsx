import type { MappingReview, MappingTest } from "@xtrakto/parsers";
import { StatusPill } from "@/components/status-pill/StatusPill";
import { cn } from "@/utils/cn.utils";
import { CONFIRMATION_COPY as COPY } from "../format-confirmation.constants";
import {
  readText,
  testLines,
  testVerdict,
} from "../format-confirmation.helpers";
import type { TestLine } from "../format-confirmation.helpers";
import { readingProblem } from "../reading-problem.helpers";

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

function Lines({ test }: { test: MappingTest }) {
  const { ways, closing } = testLines(test);
  return (
    <dl className="flex flex-col gap-2.5">
      {ways.map((line) => (
        <Line key={line.label} line={line} />
      ))}
      {closing && <Line line={closing} isTotal />}
    </dl>
  );
}

type ReadingTestProps = {
  review: MappingReview;
  /** A correction waits for its review. */
  isRereading: boolean;
};

/**
 * "Prueba con tu archivo" (v8-14): how many movements the choices read, what
 * came in and went out, and, when the file prints balances, whether its
 * closing balance adds up; or, while they don't read the whole file, what
 * to change (11.3b). Each correction's verdict is announced. The page works
 * it out; the AI does no sums.
 */
export function ReadingTest({ review, isRereading }: ReadingTestProps) {
  const { reading } = review;
  const verdict = reading.ok
    ? testVerdict(reading.value.test)
    : readingProblem(reading.error, review);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-section font-bold">{COPY.test.title}</h2>
        <p className="text-caption text-ink-muted">
          {readText(review, isRereading)}
        </p>
      </div>
      {reading.ok && <Lines test={reading.value.test} />}
      <div aria-live="polite">
        <StatusPill
          tone={verdict.tone}
          title={verdict.title}
          detail={verdict.detail}
          className="w-full"
        />
      </div>
    </div>
  );
}
