import "server-only";
import { captureMessage } from "@sentry/nextjs";
import {
  DEFAULT_TIME_ZONE,
  type LocalDate,
  localDateFromInstant,
} from "@xtrakto/core";
import { saveUsuryRates } from "@xtrakto/db";
import { extractSpreadsheet, readUsuryHistory } from "@xtrakto/parsers";
import { getDb } from "@/lib/db";
import { withSanitizedErrors } from "@/utils/sanitized-error.utils";
import { USURY_HISTORY } from "./usury-rates.constants";

/** What a run read and added, and whether this month has its rate: counts only. */
export type UsuryRefresh = {
  readonly read: number;
  readonly added: number;
  readonly hasThisMonth: boolean;
};

// The history's bytes; an answer that isn't one fails with its status.
const download = async (): Promise<Uint8Array> => {
  const response = await fetch(USURY_HISTORY.url, {
    signal: AbortSignal.timeout(USURY_HISTORY.timeoutMs),
  });
  if (!response.ok) throw new Error(`USURY_HISTORY_HTTP_${response.status}`);
  return new Uint8Array(await response.arrayBuffer());
};

/**
 * Reads the Superintendencia Financiera's usury history and adds the months
 * the table doesn't have (12.4a): every month on the first run, the new one
 * after. A history that can't be had or read fails, for Inngest to retry
 * and the function to tell Sentry; this month missing from it tells Sentry
 * too. Public figures only; counts only.
 */
export const refreshUsuryRates = async (
  today: LocalDate = localDateFromInstant(new Date(), DEFAULT_TIME_ZONE),
): Promise<UsuryRefresh> => {
  const content = extractSpreadsheet(await download());
  const history = content.ok ? readUsuryHistory(content.value) : content;
  if (!history.ok) throw new Error(`USURY_HISTORY_${history.error.code}`);
  const added = await withSanitizedErrors("USURY_RATES_NOT_SAVED", () =>
    saveUsuryRates(
      getDb(),
      history.value.map((read) => ({ ...read, source: USURY_HISTORY.source })),
    ),
  );
  const month = today.slice(0, 7);
  const hasThisMonth = history.value.some((read) =>
    read.month.startsWith(month),
  );
  if (!hasThisMonth)
    captureMessage(
      `The usury rate of ${month} isn't in the Superintendencia Financiera's history`,
      "warning",
    );
  return { read: history.value.length, added, hasThisMonth };
};
