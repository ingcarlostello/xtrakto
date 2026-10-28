"use server";

import { APP_ERROR_CODE, type AppError, err, type Result } from "@xtrakto/core";
import { getSignedInClerkUserId } from "@/lib/auth";
import { endExample } from "@/lib/example-mode";
import { submitStatementSchema } from "../upload.schemas";
import { queueStatement } from "../upload.service";
import type { SubmitStatementInput, SubmittedStatement } from "../upload.types";

/**
 * Sends one statement read in the browser to be processed: its minimized
 * content and, for a movements export, the account chosen for it. The input
 * is validated here, whatever its type says, and whose statement it is comes
 * only from the session. Once one is on its way, the browser leaves the
 * example (7.8), so the pages show the user's own movements.
 */
export async function submitStatement(
  input: SubmitStatementInput,
): Promise<Result<SubmittedStatement, AppError>> {
  const clerkUserId = await getSignedInClerkUserId();
  if (!clerkUserId) return err({ code: APP_ERROR_CODE.UNAUTHORIZED });
  const request = submitStatementSchema.safeParse(input);
  if (!request.success) return err({ code: APP_ERROR_CODE.INVALID_INPUT });
  const queued = await queueStatement(clerkUserId, request.data);
  if (queued.ok) await endExample();
  return queued;
}
