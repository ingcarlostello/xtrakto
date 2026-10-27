"use client";

import { CsvDownloadButton } from "@/components/csv-download/CsvDownloadButton";
import { Card, CardDescription, CardHeader } from "@/components/ui/card";
import { downloadMyData } from "../actions/download-my-data.action";
import { DOWNLOAD_DATA_COPY as COPY } from "../user.constants";

/** "Descargar mis datos (CSV)" (docs/ui/v8-11): every movement the user has. */
export function DownloadDataSection() {
  return (
    <Card variant="card">
      <CardHeader>
        <h2 className="font-heading text-body font-bold">{COPY.title}</h2>
        <CardDescription>{COPY.description}</CardDescription>
      </CardHeader>
      <CsvDownloadButton
        label={COPY.trigger}
        fetchCsv={downloadMyData}
        className="self-start"
      />
    </Card>
  );
}
