import {
  Check,
  ChevronDown,
  FileSpreadsheet,
  Landmark,
  List,
  UserRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Form from "next/form";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  BANK_PARAM,
  FIRST_BANK,
  FIRST_FILE,
  FIRST_FILE_COPY as COPY,
  FIRST_FILE_PARAM,
} from "../onboarding.constants";
import type { FirstFile } from "../onboarding.schemas";

// One per page, so plain ids name the choice.
const TITLE_ID = "first-file-title";
const SUBTITLE_ID = "first-file-subtitle";
const BANK_FIELD_ID = "first-file-bank";
const BANK_HINT_ID = "first-file-bank-hint";

const OPTIONS = [
  { value: FIRST_FILE.QUARTERLY, icon: FileSpreadsheet, ...COPY.quarterly },
  { value: FIRST_FILE.MOVEMENTS, icon: List, ...COPY.movements },
] as const;

type FirstFileOptionProps = {
  value: FirstFile;
  icon: LucideIcon;
  title: string;
  detail: string;
  badge?: string;
};

// A native radio, so the arrow keys move the choice; the whole card is its
// label, with the focus ring drawn around it.
function FirstFileOption({
  value,
  icon: Icon,
  title,
  detail,
  badge,
}: FirstFileOptionProps) {
  return (
    <label className="group relative flex cursor-pointer items-center gap-4 rounded-md border-2 border-transparent bg-surface p-5 shadow-card has-checked:border-primary has-focus-visible:outline-3 has-focus-visible:outline-offset-3 has-focus-visible:outline-primary">
      <input
        type="radio"
        name={FIRST_FILE_PARAM}
        value={value}
        defaultChecked={value === FIRST_FILE.QUARTERLY}
        className="sr-only"
      />
      <span
        aria-hidden
        className="flex size-11 shrink-0 items-center justify-center rounded-full bg-surface-muted text-ink group-has-checked:bg-primary-soft group-has-checked:text-primary"
      >
        <Icon className="size-5" strokeWidth={1.9} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-body font-bold">
          {title}
          {badge && <Badge variant="ok">{badge}</Badge>}
        </span>
        <span className="text-caption text-ink-muted">{detail}</span>
      </span>
      <span
        aria-hidden
        className="hidden size-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground group-has-checked:flex"
      >
        <Check className="size-4" strokeWidth={2.6} />
      </span>
    </label>
  );
}

// Whose files: Bancolombia's, or another bank's, whose columns the person
// confirms the first time (11.3c). A native select drawn as a white pill.
function BankField() {
  const { bank } = COPY;
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={BANK_FIELD_ID} className="text-body font-bold">
        {bank.label}
      </label>
      <div className="relative">
        <Landmark
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2"
        />
        <select
          id={BANK_FIELD_ID}
          name={BANK_PARAM}
          defaultValue={FIRST_BANK.BANCOLOMBIA}
          aria-describedby={BANK_HINT_ID}
          className="h-12 w-full appearance-none rounded-full bg-surface pr-11 pl-11 text-body text-ink shadow-chip"
        >
          <option value={FIRST_BANK.BANCOLOMBIA}>{bank.bancolombia}</option>
          <option value={FIRST_BANK.OTHER}>{bank.other}</option>
        </select>
        <ChevronDown
          aria-hidden
          className="pointer-events-none absolute top-1/2 right-4 size-[18px] -translate-y-1/2 text-ink-muted"
        />
      </div>
      <p id={BANK_HINT_ID} className="text-caption text-ink-muted">
        {bank.hint}
      </p>
    </div>
  );
}

/**
 * docs/ui/v8-16 without the credit card: the two files, the quarterly
 * statement first and chosen, and the bank, Bancolombia unless another. A
 * GET form, so both go to the last step in its URL, which puts that file's
 * guide first, or another bank's; nothing is stored.
 */
export function FirstFileForm() {
  return (
    <Card variant="card" className="w-full max-w-205 sm:p-8">
      <Form action="/onboarding/download" className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <h1
            id={TITLE_ID}
            className="font-display text-title font-medium text-balance"
          >
            {COPY.title}
          </h1>
          <p id={SUBTITLE_ID} className="text-body text-ink-muted">
            {COPY.subtitle}
          </p>
        </div>
        <fieldset
          aria-labelledby={TITLE_ID}
          aria-describedby={SUBTITLE_ID}
          className="flex flex-col gap-3"
        >
          {OPTIONS.map((option) => (
            <FirstFileOption key={option.value} {...option} />
          ))}
        </fieldset>
        <BankField />
        <FormFooter />
      </Form>
    </Card>
  );
}

// Why the name isn't asked, then back to the first step or on to the last.
function FormFooter() {
  return (
    <>
      <p className="flex items-start gap-3 rounded-sm bg-primary-soft-2 p-4 text-caption text-ink-secondary">
        <UserRound
          aria-hidden
          className="mt-0.5 size-4.5 shrink-0 text-primary-strong"
          strokeWidth={1.9}
        />
        {COPY.name}
      </p>
      <div className="flex items-center justify-between gap-3">
        <Button
          variant="secondary"
          nativeButton={false}
          render={<Link href="/onboarding" />}
        >
          {COPY.back}
        </Button>
        <Button type="submit">{COPY.next}</Button>
      </div>
    </>
  );
}
