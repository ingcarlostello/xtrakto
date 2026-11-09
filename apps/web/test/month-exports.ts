import {
  type CalendarMonth,
  type ExtractedContent,
  extractedContentSchema,
} from "@xtrakto/core";
import {
  createIngestionJobWithinLimit,
  type Database,
  type UserId,
  withUserContext,
} from "@xtrakto/db";
import { findParser } from "@xtrakto/parsers";
import {
  claimJob,
  ingestJob,
} from "../src/features/ingestion/ingest-statement.service";

const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;
const EXCEL_EPOCH = Date.UTC(1899, 11, 30);

export type ExportRow = readonly [
  day: number,
  description: string,
  pesos: number,
];

/** A month's movements as the export writes them, then minimized. */
export const monthExport = (
  { year, month }: CalendarMonth,
  rows: readonly ExportRow[],
): ExtractedContent => {
  const content = extractedContentSchema.parse({
    type: "spreadsheet",
    sheets: [
      {
        name: "Hoja1",
        rows: [
          ["Fecha", "Descripción", "Referencia", "Valor"],
          ...rows.map(([day, description, pesos]) => [
            {
              excelSerial:
                (Date.UTC(year, month - 1, day) - EXCEL_EPOCH) / DAY_MS +
                5 / 24,
            },
            description,
            null,
            pesos,
          ]),
        ],
      },
    ],
  });
  const parser = findParser(content);
  if (!parser.ok) throw new Error("No parser recognizes the export.");
  return parser.value.minimize(content);
};

/** Uploads content as the submit action and the function do. */
export const uploadContent = async (
  db: Database,
  userId: UserId,
  content: ExtractedContent,
): Promise<void> => {
  const parser = findParser(content);
  if (!parser.ok) throw new Error("No parser recognizes the content.");
  const created = await withUserContext(db, userId, (ctx) =>
    createIngestionJobWithinLimit(
      ctx,
      { formatId: parser.value.id, extractedContent: content },
      {
        limit: 100,
        month: {
          start: new Date(Date.now() - HOUR_MS),
          end: new Date(Date.now() + HOUR_MS),
        },
      },
    ),
  );
  if (!created.ok) throw new Error("Not created.");
  const job = { jobId: created.value, userId };
  await claimJob(job);
  await ingestJob(job);
};
