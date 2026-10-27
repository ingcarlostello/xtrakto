"use server";

import {
  APP_ERROR_CODE,
  type AppError,
  err,
  ok,
  type Result,
} from "@xtrakto/core";
import { getSignedInClerkUserId } from "@/lib/auth";
import type { CsvFile } from "@/utils/movements-csv.helpers";
import { transactionsSearchSchema } from "../transaction.schemas";
import { getMovementsCsv } from "../transaction.service";

/**
 * What the movements list shows, as a CSV to download (7.6). The input is
 * the page's search params, read with the page's own schema: whose
 * movements comes only from the session.
 */
export async function downloadMovements(
  searchParams: unknown,
): Promise<Result<CsvFile, AppError>> {
  const clerkUserId = await getSignedInClerkUserId();
  if (!clerkUserId) return err({ code: APP_ERROR_CODE.UNAUTHORIZED });
  const params = transactionsSearchSchema.safeParse(searchParams);
  if (!params.success) return err({ code: APP_ERROR_CODE.INVALID_INPUT });
  const { account, period, q, filter, category } = params.data;
  const csv = await getMovementsCsv(clerkUserId, {
    ...(account === undefined ? {} : { accountId: account }),
    ...(period === undefined ? {} : { period }),
    ...(q === undefined ? {} : { search: q }),
    ...(filter === undefined ? {} : { filter }),
    ...(category === undefined ? {} : { category }),
  });
  return csv ? ok(csv) : err({ code: APP_ERROR_CODE.NOT_FOUND });
}
