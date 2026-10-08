import { bancolombiaMovementsExportParser } from "../bancolombia/movements-export-parser.helpers";
import { bancolombiaQuarterlyParser } from "../bancolombia/quarterly-parser.helpers";
import type { BankParser } from "./bank-parser.types";
import { createParserRegistry } from "./parser-registry.helpers";

/** Every supported format. Each recognizes only its own files. */
export const DEFAULT_PARSERS: readonly BankParser[] = [
  bancolombiaQuarterlyParser,
  bancolombiaMovementsExportParser,
];

/**
 * The parser for extracted content among every supported format, or
 * `UNKNOWN_FORMAT` when none recognizes it.
 */
export const { findParser } = createParserRegistry(DEFAULT_PARSERS);
