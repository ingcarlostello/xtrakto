import { COLUMN_ROLE } from "@xtrakto/core";
import type { ColumnRole } from "@xtrakto/core";
import type { MappingChoices } from "@xtrakto/parsers";
import { Check, ChevronDown, EyeOff } from "lucide-react";
import { useId } from "react";
import { cn } from "@/utils/cn.utils";
import {
  CONFIRMATION_COPY as COPY,
  DATE_ORDER_LABELS,
  NUMBER_LABELS,
  ROLE_LABELS,
} from "../format-confirmation.constants";
import { formatFacts } from "../format-confirmation.helpers";
import type { FormatConfirmation } from "../format-mapping.types";

const chevron =
  "pointer-events-none absolute top-1/2 size-4 -translate-y-1/2 text-ink-muted";

// The option a native select changed to, among those it offers.
const chosenOf = <T extends string>(options: readonly T[], value: string) =>
  options.find((option) => option === value);

type RoleChoiceProps = {
  role: ColumnRole;
  /** The roles the other columns leave it. */
  options: readonly ColumnRole[];
  /** What the column is called, for screen readers. */
  label: string;
  onChoose: (role: ColumnRole) => void;
};

// A role the mapping reads stands out with a check; an ignored column recedes
// with a crossed eye.
const ROLE_CHIPS = {
  read: {
    Icon: Check,
    iconTone: "text-primary",
    chip: "bg-surface text-ink shadow-chip ring-1 ring-primary/40",
  },
  ignored: {
    Icon: EyeOff,
    iconTone: "text-ink-muted",
    chip: "bg-surface-muted text-ink-muted",
  },
} as const;

/** A column's role as a chip the person changes (v8-14, 11.3b). */
export function RoleChoice({
  role,
  options,
  label,
  onChoose,
}: RoleChoiceProps) {
  const { Icon, iconTone, chip } =
    ROLE_CHIPS[role === COLUMN_ROLE.NONE ? "ignored" : "read"];
  return (
    <div className="relative">
      <Icon
        aria-hidden
        className={cn(
          "pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2",
          iconTone,
        )}
      />
      <select
        aria-label={label}
        value={role}
        onChange={({ target }) => {
          const chosen = chosenOf(options, target.value);
          if (chosen !== undefined) onChoose(chosen);
        }}
        className={cn(
          "h-11 w-full appearance-none rounded-full pr-9 pl-9 text-sm font-semibold",
          chip,
        )}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {ROLE_LABELS[option]}
          </option>
        ))}
      </select>
      <ChevronDown aria-hidden className={cn(chevron, "right-3")} />
    </div>
  );
}

type FormatChoiceProps<T extends string> = {
  term: string;
  value: T;
  /** Each option, as the person reads it. */
  labels: Readonly<Record<T, string>>;
  onChoose: (value: T) => void;
};

// A format as a white pill: its term, and its value as a select.
function FormatChoice<T extends string>({
  term,
  value,
  labels,
  onChoose,
}: FormatChoiceProps<T>) {
  const id = useId();
  // Safe: the keys of a record of T are T.
  const options = Object.keys(labels) as T[];
  return (
    <div className="relative flex h-11 items-center rounded-full bg-surface text-sm shadow-chip has-[select:focus-visible]:outline-3 has-[select:focus-visible]:outline-offset-3 has-[select:focus-visible]:outline-primary">
      <label htmlFor={id} className="pl-3.5 font-semibold">
        {term}
      </label>
      <select
        id={id}
        value={value}
        onChange={({ target }) => {
          const chosen = chosenOf(options, target.value);
          if (chosen !== undefined) onChoose(chosen);
        }}
        className="h-full appearance-none rounded-full bg-transparent pr-9 pl-1.5 text-ink-muted focus-visible:outline-none"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {labels[option]}
          </option>
        ))}
      </select>
      <ChevronDown aria-hidden className={cn(chevron, "right-3.5")} />
    </div>
  );
}

type FileFormatProps = {
  confirmation: FormatConfirmation;
  onCorrect: (choices: MappingChoices) => void;
};

/**
 * "Formato del archivo" (v8-14): how the file writes its numbers and dates,
 * which the person changes (11.3b), then its currency and where its table
 * starts and ends, which a saved format finds by its header and its last date.
 */
export function FileFormat({ confirmation, onCorrect }: FileFormatProps) {
  const { review, choices } = confirmation;
  const { format } = COPY;
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-body font-bold">{format.title}</h3>
      <div className="flex flex-wrap gap-2">
        <FormatChoice
          term={format.numbers}
          value={choices.decimalSeparator ?? review.decimalSeparator}
          labels={NUMBER_LABELS}
          onChoose={(decimalSeparator) =>
            onCorrect({ ...choices, decimalSeparator })
          }
        />
        <FormatChoice
          term={format.dates}
          value={choices.dateOrder ?? review.dateOrder}
          labels={DATE_ORDER_LABELS}
          onChoose={(dateOrder) => onCorrect({ ...choices, dateOrder })}
        />
        <dl className="flex flex-wrap gap-2">
          {formatFacts(review).map(({ term, value }) => (
            <div
              key={term}
              className="flex h-11 items-center gap-1.5 rounded-full bg-surface px-3.5 text-sm shadow-chip"
            >
              <dt className="font-semibold">{term}</dt>
              <dd className="text-ink-muted">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
