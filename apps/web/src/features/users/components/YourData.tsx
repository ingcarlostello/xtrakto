import type { UserFiles } from "@xtrakto/db";
import { CoverageLegend } from "@/components/coverage-timeline/CoverageLegend";
import { CoverageTimeline } from "@/components/coverage-timeline/CoverageTimeline";
import type { CoverageView } from "@/components/coverage-timeline/coverage-timeline.types";
import { Card, CardDescription, CardHeader } from "@/components/ui/card";
import { YOUR_DATA_COPY as COPY } from "../user.constants";
import { filesText } from "../your-data.helpers";

type YourDataProps = {
  files: UserFiles;
  coverage: readonly CoverageView[];
};

/**
 * "Tus datos" (docs/ui/v8-11): how many files the user keeps, and each
 * account's months as its coverage timeline shows them, named by their
 * sentence.
 */
export function YourData({ files, coverage }: YourDataProps) {
  return (
    <Card variant="card" aria-labelledby="your-data-title">
      <CardHeader>
        <h2 id="your-data-title" className="text-section font-bold">
          {COPY.title}
        </h2>
        <CardDescription>{filesText(files)}</CardDescription>
      </CardHeader>
      {coverage.map((view) => (
        <div key={view.accountId} className="flex flex-col gap-2">
          {view.accountLabel !== undefined && (
            <h3 className="text-sm font-bold">{view.accountLabel}</h3>
          )}
          <CoverageTimeline segments={view.segments} label={view.sentence} />
        </div>
      ))}
      {coverage.length > 0 && <CoverageLegend views={coverage} />}
    </Card>
  );
}
