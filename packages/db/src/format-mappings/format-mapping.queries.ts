import { formatFingerprint, formatMappingSchema } from "@xtrakto/core";
import type { FormatMapping } from "@xtrakto/core";
import { and, eq, sql } from "drizzle-orm";
import type { UserContext } from "../user-context/user-context.types";
import { formatMappings, userFormatMappings } from "./format-mapping.schemas";

/** A saved mapping, and whether it's everyone's or the user's alone. */
export type SavedFormatMapping = {
  readonly mapping: FormatMapping;
  readonly isShared: boolean;
};

// A row's mapping as the schema reads it: one it no longer reads, after the
// schema changed, counts as none, so its format is asked about again.
const readMapping = (row: { mapping: unknown } | undefined) => {
  const mapping = formatMappingSchema.safeParse(row?.mapping);
  return mapping.success ? mapping.data : undefined;
};

/**
 * The mapping that reads a format for the user, by its header's names: the
 * one they confirmed, else the one everyone shares, if any.
 */
export const findFormatMapping = async (
  { tx, userId }: UserContext,
  header: readonly string[],
): Promise<SavedFormatMapping | undefined> => {
  const fingerprint = await formatFingerprint(header);
  const [own] = await tx
    .select({ mapping: userFormatMappings.mapping })
    .from(userFormatMappings)
    .where(
      and(
        eq(userFormatMappings.userId, userId),
        eq(userFormatMappings.fingerprint, fingerprint),
      ),
    );
  const ownMapping = readMapping(own);
  if (ownMapping) return { mapping: ownMapping, isShared: false };
  const [shared] = await tx
    .select({ mapping: formatMappings.mapping })
    .from(formatMappings)
    .where(eq(formatMappings.fingerprint, fingerprint));
  const sharedMapping = readMapping(shared);
  return sharedMapping ? { mapping: sharedMapping, isShared: true } : undefined;
};

/**
 * Saves a mapping the user confirmed, which reads their files of its format
 * from now on, replacing the one they confirmed before.
 */
export const saveOwnFormatMapping = async (
  { tx, userId }: UserContext,
  mapping: FormatMapping,
): Promise<void> => {
  const fingerprint = await formatFingerprint(mapping.header);
  await tx
    .insert(userFormatMappings)
    .values({ userId, fingerprint, mapping })
    .onConflictDoUpdate({
      target: [userFormatMappings.userId, userFormatMappings.fingerprint],
      set: { mapping, updatedAt: sql`now()` },
    });
};

/**
 * Shares a mapping its balances proved with every user, linked to none. A
 * format keeps the first one shared: whether this one is it.
 */
export const shareFormatMapping = async (
  { tx }: UserContext,
  mapping: FormatMapping,
): Promise<boolean> => {
  const fingerprint = await formatFingerprint(mapping.header);
  const shared = await tx
    .insert(formatMappings)
    .values({ fingerprint, mapping })
    .onConflictDoNothing({ target: formatMappings.fingerprint })
    .returning({ id: formatMappings.id });
  return shared.length > 0;
};
