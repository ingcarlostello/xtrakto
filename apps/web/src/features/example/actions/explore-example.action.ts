"use server";

import { APP_ERROR_CODE, type AppError, err, type Result } from "@xtrakto/core";
import { redirect } from "next/navigation";
import { getSignedInClerkUserId } from "@/lib/auth";
import { startExample } from "@/lib/example-mode";
import { ensureExampleData } from "../example.service";

/**
 * Opens the example (7.8): its data saved if it isn't yet, and this
 * browser's pages showing it from the summary on, until the user leaves.
 * Only for a signed-in user; it changes nothing of theirs. It answers only
 * when it can't open it: otherwise it takes the browser to the summary.
 */
export async function exploreExample(): Promise<Result<never, AppError>> {
  if (!(await getSignedInClerkUserId()))
    return err({ code: APP_ERROR_CODE.UNAUTHORIZED });
  await ensureExampleData();
  await startExample();
  redirect("/");
}
