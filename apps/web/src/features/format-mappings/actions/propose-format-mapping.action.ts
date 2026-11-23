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
import { isRetryOf } from "../mapping-proposal.helpers";
import { proposeRolesFor } from "../mapping-proposal.service";
import {
  type MappingRetry,
  mappingRetrySchema,
} from "../mapping-retry.schemas";

const INVALID = err({ code: APP_ERROR_CODE.INVALID_INPUT });

/**
 * Proposes how to read a file of a format Xtrakto doesn't know (11.2b): the
 * role of each of its columns, from its sample; a second time, also from the
 * roles proposed before and what failed (11.4). Both are validated here,
 * whatever their types say: names, shapes, roles and codes only, never a
 * value of the file (ADR 0038). Whose call it is, and whose month pays for
 * it, comes only from the session.
 */
export async function proposeFormatMapping(
  input: FormatSample,
  again?: MappingRetry,
): Promise<Result<{ roles: ColumnRole[] }, AppError | AiError>> {
  const clerkUserId = await getSignedInClerkUserId();
  if (!clerkUserId) return err({ code: APP_ERROR_CODE.UNAUTHORIZED });
  const sample = formatSampleSchema.safeParse(input);
  if (!sample.success) return INVALID;
  const retry =
    again === undefined ? undefined : mappingRetrySchema.safeParse(again);
  if (retry && (!retry.success || !isRetryOf(retry.data, sample.data))) {
    return INVALID;
  }
  const told = retry?.data;
  const proposal = await (told === undefined
    ? proposeRolesFor(clerkUserId, sample.data)
    : proposeRolesFor(clerkUserId, sample.data, told));
  return proposal.ok ? ok({ roles: [...proposal.value.roles] }) : proposal;
}
