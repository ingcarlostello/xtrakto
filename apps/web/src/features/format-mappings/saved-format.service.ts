import "server-only";
import type { FormatMapping } from "@xtrakto/core";
import {
  findFormatMapping,
  findOrCreateUser,
  withUserContext,
} from "@xtrakto/db";
import { getDb } from "@/lib/db";
import { withSanitizedErrors } from "@/utils/sanitized-error.utils";

/**
 * The mapping saved for a format, by its header's names (Stage 11): the one
 * the signed-in user confirmed, else the one everyone shares, else none. The
 * browser reads the file with it, and the server proves it again when the
 * file is sent. Their row is created for it, since a proposal may follow. The
 * Clerk id must come from the session; unexpected errors are sanitized.
 */
export const findSavedMapping = (
  clerkUserId: string,
  header: readonly string[],
): Promise<FormatMapping | undefined> =>
  withSanitizedErrors("MAPPING_NOT_FOUND", async () => {
    const db = getDb();
    const userId = await findOrCreateUser(db, clerkUserId);
    const saved = await withUserContext(db, userId, (ctx) =>
      findFormatMapping(ctx, header),
    );
    return saved?.mapping;
  });
