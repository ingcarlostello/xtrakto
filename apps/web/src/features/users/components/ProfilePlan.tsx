import { formatDayInWords, type LocalDate } from "@xtrakto/core";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PLAN_COPY as COPY } from "../user.constants";

type MonthFilesProps = {
  /** The month's statements that hold a slot (5.4a). */
  used: number;
  limit: number;
  resetsOn: LocalDate;
};

type ProfilePlanProps = MonthFilesProps & {
  /** The month's LLM calls reached the user's limit (8.3). */
  isAiUsedUp: boolean;
};

const FILES_LABEL_ID = "plan-files";

// The month's statements against their limit, as a meter, and when the
// count starts again.
function MonthFiles({ used, limit, resetsOn }: MonthFilesProps) {
  const shown = Math.min(used, limit);
  const count = `${shown} ${COPY.of} ${limit}`;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <p id={FILES_LABEL_ID} className="text-sm font-bold">
          {COPY.files}
        </p>
        <p className="text-sm text-ink-secondary tabular-nums">{count}</p>
      </div>
      <div
        role="meter"
        aria-labelledby={FILES_LABEL_ID}
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-valuenow={shown}
        aria-valuetext={count}
        className="h-2 overflow-hidden rounded-full bg-ring-track"
      >
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${(shown / limit) * 100}%` }}
        />
      </div>
      <p className="text-caption text-ink-muted">
        {`${COPY.resetsOn} ${formatDayInWords(resetsOn)}.`}
      </p>
    </div>
  );
}

/**
 * "Tu plan" (docs/ui/v8-11): the month's statements, the size a file may
 * have, and, when the month's LLM calls ran out, until when the movements no
 * rule knows wait.
 */
export function ProfilePlan({ isAiUsedUp, ...files }: ProfilePlanProps) {
  return (
    <Card variant="panel">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-section font-bold">{COPY.title}</h2>
        <Badge variant="info">{COPY.free}</Badge>
      </div>
      <MonthFiles {...files} />
      <p className="rounded-sm bg-surface-muted p-4 text-sm font-bold">
        {COPY.fileSize}
      </p>
      {isAiUsedUp && (
        <p className="rounded-sm bg-surface-muted p-4 text-sm">
          {`${COPY.aiUsedUp} ${formatDayInWords(files.resetsOn)}.`}
        </p>
      )}
    </Card>
  );
}
