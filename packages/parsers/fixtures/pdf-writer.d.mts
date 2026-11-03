import type { PdfContent } from "@xtrakto/core";

/**
 * A letter-size PDF with the content's pages and text items, each at its
 * position (its baseline from the page's top left) in Courier at its height,
 * encrypted with AES-256 when a password is given.
 */
export declare const contentToPdf: (
  content: PdfContent,
  options?: { readonly userPassword?: string },
) => Promise<Uint8Array>;

/** A PDF whose pages hold only an image, as a scanner writes them. */
export declare const scannedPdf: (pageCount?: number) => Promise<Uint8Array>;
