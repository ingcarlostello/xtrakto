"use client";

import { type ReactNode, type RefObject, useEffect, useRef } from "react";
import type { CoverageView } from "@/components/coverage-timeline/coverage-timeline.types";
import { ConfirmFormatView } from "@/features/format-mappings/components/ConfirmFormatView";
import { useUploadFlow } from "../hooks/use-upload-flow";
import type { MonthlyUsage, UploadAccount } from "../upload.types";
import { UploadFlow } from "./UploadFlow";

// Once the person confirms a file's format or leaves it out, the view goes
// and the focus would fall to the page: hand it to the picker.
const usePickerFocusAfterConfirming = (
  confirmingId: string | undefined,
  picker: RefObject<HTMLButtonElement | null>,
) => {
  const wasConfirming = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (wasConfirming.current && !confirmingId) picker.current?.focus();
    wasConfirming.current = confirmingId;
  }, [confirmingId, picker]);
};

type UploadScreenProps = {
  /** The user's accounts, where a movements export can go. */
  accounts: readonly UploadAccount[];
  /** The month's statements, counted on the server. */
  usage: MonthlyUsage;
  /** Each account's months, read again when the last job ends (10.2a). */
  coverage: readonly CoverageView[];
  /** The page's title row, rendered on the server. */
  header: ReactNode;
  /** Beside the upload card: the privacy facts and the files sent. */
  side: ReactNode;
  /** At the end of the upload card: the formats read today. */
  formats: ReactNode;
};

/**
 * The upload screen (docs/ui/v8-07), which holds the files chosen: the
 * upload card with the files and what they came to, or, while a file no
 * parser knows waits for the person, "Confirma cómo leer tu extracto"
 * (v8-14, 11.3a, 11.3b) in its place, one file at a time.
 */
export function UploadScreen(props: UploadScreenProps) {
  const { accounts, usage, coverage, header, side, formats } = props;
  const flow = useUploadFlow(accounts);
  const { confirming, formatActions, picker } = flow;
  usePickerFocusAfterConfirming(confirming?.id, picker);
  if (confirming) {
    const { id } = confirming;
    return (
      <ConfirmFormatView
        key={id}
        fileName={confirming.file.name}
        confirmation={confirming.confirmation}
        onCorrect={(choices) => formatActions.onCorrect(id, choices)}
        onConfirm={(mapping) => formatActions.onConfirm(id, mapping)}
        onLeaveOut={() => formatActions.onLeaveOut(id)}
      />
    );
  }
  return (
    <>
      {header}
      <div className="flex flex-wrap items-start gap-5.5">
        <div className="flex min-w-0 flex-[2_1_600px] flex-col gap-5.5">
          <UploadFlow {...{ flow, accounts, usage, coverage }}>
            {formats}
          </UploadFlow>
        </div>
        <div className="flex min-w-0 flex-[1_1_340px] flex-col gap-5.5">
          {side}
        </div>
      </div>
    </>
  );
}
