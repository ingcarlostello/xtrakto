"use server";

import {
  APP_ERROR_CODE,
  type AppError,
  err,
  type FormatMapping,
  formatHeaderSchema,
  ok,
  type Result,
} from "@xtrakto/core";
import { getSignedInClerkUserId } from "@/lib/auth";
import { findSavedMapping } from "../saved-format.service";

/**
 * How to read a file of a format Xtrakto's parsers don't know, when someone
 * confirmed it before (11.3a): the mapping saved for its header's names, the
 * user's or everyone's, or none. The header is validated here, whatever its
 * type says, and whose lookup it is comes only from the session.
 */
export async function findSavedFormat(
  header: readonly string[],
): Promise<Result<{ mapping: FormatMapping | null }, AppError>> {
  const clerkUserId = await getSignedInClerkUserId();
  if (!clerkUserId) return err({ code: APP_ERROR_CODE.UNAUTHORIZED });
  const names = formatHeaderSchema.safeParse(header);
  if (!names.success) return err({ code: APP_ERROR_CODE.INVALID_INPUT });
  const mapping = await findSavedMapping(clerkUserId, names.data);
  return ok({ mapping: mapping ?? null });
}
