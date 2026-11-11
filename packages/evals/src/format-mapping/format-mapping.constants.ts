import type { MappingThresholds } from "./format-mapping.types";

/** The figures a model must reach on the mapping set, in the report's order. */
export const MAPPING_THRESHOLD_FIGURES = [
  "rolesRightShare",
  "readRightShare",
] as const satisfies readonly (keyof MappingThresholds)[];

/**
 * The lowest shares each model passes the mapping set with: a few points
 * under the first run's weaker model (11.2b), `deepseek-v4-pro`, with every
 * role right in 0.917 of the files and 0.958 read whole and added up. Two or
 * three files more or less pass; a prompt that loses several fails.
 */
export const MAPPING_THRESHOLDS: MappingThresholds = {
  rolesRightShare: 0.85,
  readRightShare: 0.9,
};
