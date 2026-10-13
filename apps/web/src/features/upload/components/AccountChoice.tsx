import { useId } from "react";
import type { AccountDestination } from "../account-destination.helpers";
import { UPLOAD_COPY as COPY } from "../upload.constants";

type AccountChoiceProps = {
  destination: AccountDestination;
  chosen: string | undefined;
  onChoose: (key: string) => void;
};

// A movements export doesn't name its account: say where it will go, or ask
// when the person has several.
export function AccountChoice({
  destination,
  chosen,
  onChoose,
}: AccountChoiceProps) {
  const selectId = useId();
  if (destination.kind === "known") {
    return (
      <p className="text-caption text-ink-muted">
        {`${COPY.savedIn} ${destination.label}.`}
      </p>
    );
  }
  // A choice that no longer fits (its statement was removed) asks again.
  const isOffered = destination.options.some(({ key }) => key === chosen);
  return (
    <div className="flex flex-col items-start gap-1.5">
      <label
        htmlFor={selectId}
        className="text-caption font-semibold text-ink-secondary"
      >
        {COPY.chooseAccount}
      </label>
      <select
        id={selectId}
        value={isOffered ? chosen : ""}
        onChange={(event) => onChoose(event.target.value)}
        className="h-11 max-w-full rounded-full border border-chart-axis bg-surface px-4 text-sm text-ink"
      >
        <option value="" disabled>
          {COPY.chooseAccountPlaceholder}
        </option>
        {destination.options.map(({ key, label }) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </select>
    </div>
  );
}
