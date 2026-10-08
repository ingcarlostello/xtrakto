import { bancolombiaQuarterlyParser } from "../bancolombia/quarterly-parser.helpers";
import { createParserRegistry } from "./parser-registry.helpers";

/**
 * The parser for extracted content among every supported format, or
 * `UNKNOWN_FORMAT` when none recognizes it.
 */
export const { findParser } = createParserRegistry([
  bancolombiaQuarterlyParser,
]);
