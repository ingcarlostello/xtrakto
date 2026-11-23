import { COLUMN_ROLE, MAX_ROW_CELLS } from "@xtrakto/core";
import { z } from "zod";
import { MAPPING_FAILURE, UNREAD_CAUSE } from "./format-agent.constants";

/**
 * What failed in a proposal's reading (11.4), in codes: a column by its
 * number from 1, as the prompt numbers them, a cause, or a share of rows.
 * Strict, so no value of the file rides along.
 */
export const mappingFailureSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal(MAPPING_FAILURE.UNREAD),
    column: z.int().min(1).max(MAX_ROW_CELLS).optional(),
    cause: z.enum(UNREAD_CAUSE),
  }),
  z.strictObject({ kind: z.literal(MAPPING_FAILURE.NO_MOVEMENTS) }),
  z.strictObject({
    kind: z.literal(MAPPING_FAILURE.BALANCES_BREAK),
    /** The movements whose balance doesn't follow, in percent. */
    percent: z.int().min(0).max(100),
  }),
]);

/** A second proposal's input beside the sample: the roles before, and what failed. */
export const mappingRetrySchema = z.strictObject({
  roles: z.array(z.enum(COLUMN_ROLE)).min(1).max(MAX_ROW_CELLS),
  failure: mappingFailureSchema,
});

export type MappingFailure = z.infer<typeof mappingFailureSchema>;
export type MappingRetry = z.infer<typeof mappingRetrySchema>;
