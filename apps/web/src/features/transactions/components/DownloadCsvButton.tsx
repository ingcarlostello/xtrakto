"use client";

import { CsvDownloadButton } from "@/components/csv-download/CsvDownloadButton";
import { downloadMovements } from "../actions/download-movements.action";
import { TRANSACTIONS_COPY } from "../transaction.constants";

type PageSearchParams = Readonly<Record<string, string | string[] | undefined>>;

/**
 * "Descargar CSV" (docs/ui/v8-03): what the list shows, by the page's own
 * search params, which the server reads again.
 */
export function DownloadCsvButton({
  searchParams,
}: {
  searchParams: PageSearchParams;
}) {
  return (
    <CsvDownloadButton
      label={TRANSACTIONS_COPY.downloadCsv}
      fetchCsv={() => downloadMovements(searchParams)}
      className="w-full sm:w-auto"
    />
  );
}
