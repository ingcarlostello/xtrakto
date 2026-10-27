"use client";

import type { AppError, Result } from "@xtrakto/core";
import { FileDown } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn.utils";
import {
  CSV_BYTE_ORDER_MARK,
  type CsvFile,
} from "@/utils/movements-csv.helpers";
import { CSV_DOWNLOAD_COPY as COPY } from "./csv-download.constants";

// Hands the file to the browser as a download, after the byte order mark
// Excel needs, then lets its memory go.
const saveFile = ({ fileName, content }: CsvFile): void => {
  const url = URL.createObjectURL(
    new Blob([CSV_BYTE_ORDER_MARK, content], {
      type: "text/csv;charset=utf-8",
    }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
};

type CsvDownloadButtonProps = {
  label: string;
  /** Asks the server for the file: a server action, or a call to one. */
  fetchCsv: () => Promise<Result<CsvFile, AppError>>;
  /** The button and its message's box: full width on phones, for instance. */
  className?: string;
};

/**
 * A Secondary button that downloads a CSV the server prepares (7.6). While
 * it waits it keeps its focus and says so; a failure says what to do.
 */
export function CsvDownloadButton({
  label,
  fetchCsv,
  className,
}: CsvDownloadButtonProps) {
  const [isPending, setIsPending] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);
  const download = async () => {
    setHasFailed(false);
    setIsPending(true);
    // An unexpected failure (the database, a new deployment) rejects it.
    const result = await fetchCsv().catch(() => null);
    setIsPending(false);
    if (result?.ok) saveFile(result.value);
    else setHasFailed(true);
  };
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Button
        variant="secondary"
        onClick={download}
        disabled={isPending}
        focusableWhenDisabled
      >
        <FileDown aria-hidden strokeWidth={2.2} />
        {isPending ? COPY.pending : label}
      </Button>
      {hasFailed && (
        <p role="alert" className="text-caption font-semibold text-danger">
          {COPY.failed}
        </p>
      )}
    </div>
  );
}
