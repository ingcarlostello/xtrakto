"use server";

import {
  APP_ERROR_CODE,
  type AppError,
  type ColumnRole,
  err,
  type FormatSample,
  formatSampleSchema,
  ok,
  type Result,
} from "@xtrakto/core";
import type { AiError } from "@/lib/ai";
import { getSignedInClerkUserId } from "@/lib/auth";
import { proposeRolesFor } from "../mapping-proposal.service";

/**
 * Proposes how to read a file of a format Xtrakto doesn't know (11.2b): the
 * role of each of its columns, from its sample. The sample is validated
 * here, whatever its type says: names and shapes only, never a value of the
 * file (ADR 0038). Whose call it is, and whose month pays for it, comes only
 * from the session.
 */
export async function proposeFormatMapping(
  input: FormatSample,
): Promise<Result<{ roles: ColumnRole[] }, AppError | AiError>> {
  const clerkUserId = await getSignedInClerkUserId();
  if (!clerkUserId) return err({ code: APP_ERROR_CODE.UNAUTHORIZED });
  const sample = formatSampleSchema.safeParse(input);
  if (!sample.success) return err({ code: APP_ERROR_CODE.INVALID_INPUT });
  const proposal = await proposeRolesFor(clerkUserId, sample.data);
  return proposal.ok ? ok({ roles: [...proposal.value.roles] }) : proposal;
}
