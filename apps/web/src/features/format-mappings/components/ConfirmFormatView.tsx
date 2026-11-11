"use client";

import {
  BANKS,
  type BankId,
  type FormatMapping,
  isBankId,
} from "@xtrakto/core";
import { ChevronDown, Info, Landmark } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { StatusPill } from "@/components/status-pill/StatusPill";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CONFIRMATION_COPY as COPY } from "../format-confirmation.constants";
import type { MappingProposal } from "../format-mapping.types";
import { MappingColumns } from "./MappingColumns";
import { ReadingTest } from "./ReadingTest";

const BANK_FIELD_ID = "format-bank";
const BANK_HINT_ID = "format-bank-hint";

type BankChoiceProps = {
  value: BankId | "";
  onChange: (bank: BankId | "") => void;
};

// Whose format it is, as the person says: the file doesn't name its bank.
function BankChoice({ value, onChange }: BankChoiceProps) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={BANK_FIELD_ID} className="text-body font-bold">
        {COPY.bank.label}
      </label>
      <div className="relative">
        <Landmark
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2"
        />
        <select
          id={BANK_FIELD_ID}
          value={value}
          onChange={({ target }) =>
            onChange(isBankId(target.value) ? target.value : "")
          }
          className="h-12 w-full appearance-none rounded-full bg-surface pr-11 pl-11 text-body text-ink shadow-chip"
        >
          <option value="">{COPY.bank.placeholder}</option>
          {BANKS.map(({ id, labelEs }) => (
            <option key={id} value={id}>
              {labelEs}
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden
          className="pointer-events-none absolute top-1/2 right-4 size-[18px] -translate-y-1/2 text-ink-muted"
        />
      </div>
    </div>
  );
}

function OnlyOnce() {
  return (
    <Card variant="card" className="min-w-0 flex-[1_1_340px] gap-3">
      <span className="flex size-11 items-center justify-center rounded-full bg-primary-soft">
        <Info aria-hidden className="size-5 text-primary" />
      </span>
      <h2 className="text-body font-bold">{COPY.onlyOnce.title}</h2>
      <p className="text-caption text-ink-secondary">{COPY.onlyOnce.detail}</p>
    </Card>
  );
}

// The view's title takes the focus when it opens, as a page's would.
function ViewTitle() {
  const title = useRef<HTMLHeadingElement>(null);
  useEffect(() => title.current?.focus(), []);
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-col gap-0.5">
        <h1
          ref={title}
          tabIndex={-1}
          className="font-display text-title font-medium text-balance"
        >
          {COPY.title}
        </h1>
        <p className="text-sm text-ink-muted">{COPY.subtitle}</p>
      </div>
      <StatusPill
        tone="attention"
        title={COPY.newFormat}
        detail={COPY.unknownBank}
        className="w-full sm:w-auto"
      />
    </div>
  );
}

type ConfirmActionsProps = {
  isBankChosen: boolean;
  onConfirm: () => void;
  onLeaveOut: () => void;
};

// "Confirmar y leer" waits for the bank, focusable and saying why.
function ConfirmActions({
  isBankChosen,
  onConfirm,
  onLeaveOut,
}: ConfirmActionsProps) {
  return (
    <div className="flex flex-col items-start gap-2">
      <div className="flex flex-wrap gap-3">
        <Button
          disabled={!isBankChosen}
          focusableWhenDisabled
          aria-describedby={isBankChosen ? undefined : BANK_HINT_ID}
          onClick={onConfirm}
        >
          {COPY.confirm}
        </Button>
        <Button variant="secondary" onClick={onLeaveOut}>
          {COPY.leaveOut}
        </Button>
      </div>
      {!isBankChosen && (
        <p id={BANK_HINT_ID} className="text-caption text-ink-muted">
          {COPY.bank.hint}
        </p>
      )}
    </div>
  );
}

type ConfirmFormatViewProps = {
  /** Shown here only: a file's name never leaves the browser. */
  fileName: string;
  proposal: MappingProposal;
  /** Reads the file with the mapping, its bank included. */
  onConfirm: (mapping: FormatMapping) => void;
  /** "Algo está mal": leaves the file out, unread, saving nothing. */
  onLeaveOut: () => void;
};

/**
 * "Confirma cómo leer tu extracto" (docs/ui/v8-14), a view of the upload
 * screen while a file no parser knows waits for the person (11.3a): what the
 * LLM's proposal reads in each column, how the file adds up with it, and its
 * bank, which "Confirmar y leer" needs. Its title takes the focus.
 */
export function ConfirmFormatView({
  fileName,
  proposal,
  onConfirm,
  onLeaveOut,
}: ConfirmFormatViewProps) {
  const [bank, setBank] = useState<BankId | "">("");
  const isBankChosen = bank !== "";
  const confirm = () => {
    if (isBankChosen) onConfirm({ ...proposal.mapping, bankId: bank });
  };
  return (
    <>
      <ViewTitle />
      <MappingColumns fileName={fileName} proposal={proposal} />
      <div className="flex flex-wrap items-start gap-5.5">
        <Card variant="card" className="min-w-0 flex-[2_1_600px] gap-5">
          <ReadingTest test={proposal.review.test} />
          <BankChoice value={bank} onChange={setBank} />
          <ConfirmActions
            isBankChosen={isBankChosen}
            onConfirm={confirm}
            onLeaveOut={onLeaveOut}
          />
        </Card>
        <OnlyOnce />
      </div>
    </>
  );
}
