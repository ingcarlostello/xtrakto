import type { ExtractedContent } from "@xtrakto/core";
import { MAX_UPLOAD_CONTENT_BYTES } from "./upload.constants";

/**
 * Whether content fits in one upload, measured as the JSON it's sent as. The
 * browser checks before sending and the server again when it arrives, so
 * both must measure the same way.
 */
export const fitsInUpload = (content: ExtractedContent): boolean =>
  new TextEncoder().encode(JSON.stringify(content)).byteLength <=
  MAX_UPLOAD_CONTENT_BYTES;
