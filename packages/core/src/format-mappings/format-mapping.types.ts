import type { z } from "zod";
import type { COLUMN_ROLE, ROLES_PROBLEM } from "./format-mapping.constants";
import type { formatMappingSchema } from "./format-mapping.schemas";
import type { formatSampleSchema } from "./format-sample.schemas";

export type ColumnRole = (typeof COLUMN_ROLE)[keyof typeof COLUMN_ROLE];

export type RolesProblem = (typeof ROLES_PROBLEM)[keyof typeof ROLES_PROBLEM];

export type FormatMapping = z.infer<typeof formatMappingSchema>;

export type FormatSample = z.infer<typeof formatSampleSchema>;
