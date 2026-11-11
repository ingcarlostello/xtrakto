import { mappingCase } from "./format-mapping-cases.helpers";
import { mappingLayouts } from "./format-mapping-layouts.helpers";
import type { MappingCase } from "./format-mapping.types";

/**
 * The mapping proposal's set (11.2a): invented banks' spreadsheets, each with
 * the mapping a person would confirm for it. Never a real bank's file or
 * layout.
 */
export const FORMAT_MAPPING_CASES: readonly MappingCase[] =
  mappingLayouts().map((layout, index) => mappingCase(layout, index));
