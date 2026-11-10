import type { z } from "zod";
import type { COLUMN_ROLE } from "./format-mapping.constants";
import type { formatMappingSchema } from "./format-mapping.schemas";

export type ColumnRole = (typeof COLUMN_ROLE)[keyof typeof COLUMN_ROLE];

export type FormatMapping = z.infer<typeof formatMappingSchema>;
