import type {
  MOVEMENTS_EXPORT_FORMAT_ID,
  MOVEMENTS_PDF_FORMAT_ID,
  QUARTERLY_FORMAT_ID,
  QUARTERLY_PDF_FORMAT_ID,
} from "../bancolombia/bancolombia.constants";
import type {
  CARD_FORMAT_ID,
  CARD_PDF_FORMAT_ID,
} from "../bancolombia/card.constants";
import type { NU_CARD_FORMAT_ID } from "../nu/nu.constants";

/** The formats the default registry reads, as each statement keeps its own. */
export type FormatId =
  | typeof QUARTERLY_FORMAT_ID
  | typeof QUARTERLY_PDF_FORMAT_ID
  | typeof MOVEMENTS_EXPORT_FORMAT_ID
  | typeof MOVEMENTS_PDF_FORMAT_ID
  | typeof CARD_FORMAT_ID
  | typeof CARD_PDF_FORMAT_ID
  | typeof NU_CARD_FORMAT_ID;
