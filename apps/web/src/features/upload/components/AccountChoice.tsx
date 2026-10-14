import { useId } from "react";
import type {
  AccountDestination,
  AccountOption,
} from "../account-destination.helpers";
import { UPLOAD_COPY as COPY } from "../upload.constants";
import type { AccountKey } from "../upload.types";

type AccountSelectProps = {
  options: readonly AccountOption[];
  chosen: AccountKey | undefined;
  onChoose: (key: AccountKey) => void;
  isBusy: boolean;
};

function AccountSelect({
  options,
  chosen,
  onChoose,
  isBusy,
}: AccountSelectProps) {
  const selectId = useId();
  // A choice that no longer fits (its statement was removed) asks again.
  const isOffered = options.some(({ key }) => key === chosen);
  const choose = (value: string) => {
    const option = options.find(({ key }) => key === value);
    if (option) onChoose(option.key);
  };
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
        disabled={isBusy}
        onChange={(event) => choose(event.target.value)}
        className="h-11 max-w-full rounded-full border border-chart-axis bg-surface pr-2 pl-3.5 text-sm text-ink"
      >
        <option value="" disabled>
          {COPY.chooseAccountPlaceholder}
        </option>
        {options.map(({ key, label }) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </select>
    </div>
  );
}

type AccountChoiceProps = {
  destination: AccountDestination;
  chosen: AccountKey | undefined;
  onChoose: (key: AccountKey) => void;
  /** While files go up, the choice waits. */
  isBusy?: boolean;
};

// A movements export doesn't name its account: say where it will go, or ask
// when the person has several.
export function AccountChoice({
  destination,
  chosen,
  onChoose,
  isBusy = false,
}: AccountChoiceProps) {
  if (destination.kind === "known") {
    return (
      <p className="text-caption text-ink-muted">
        {`${COPY.savedIn} ${destination.label}.`}
      </p>
    );
  }
  return (
    <AccountSelect
      options={destination.options}
      chosen={chosen}
      onChoose={onChoose}
      isBusy={isBusy}
    />
  );
}
