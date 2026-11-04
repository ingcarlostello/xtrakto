import {
  APP_ERROR_CODE,
  MAX_PDF_PAGES,
  err,
  extractedContentSchema,
  ok,
} from "@xtrakto/core";
import type { PdfContent, Result } from "@xtrakto/core";
import type * as Pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { toPdfPage } from "./pdf-text-items.helpers";

type PdfDocument = Pdfjs.PDFDocumentProxy;

export type PdfExtractionOptions = {
  /** The PDF's password, typed by the person; it never leaves the browser. */
  readonly password?: string;
};

// "%PDF-", which may follow up to 1,024 bytes of anything else, as pdf.js
// reads it.
const PDF_SIGNATURE = [0x25, 0x50, 0x44, 0x46, 0x2d];
const HEADER_SEARCH_BYTES = 1024;

const unknownFileType: Result<never> = err({
  code: APP_ERROR_CODE.UNKNOWN_FORMAT,
  details: { reason: "file_type" },
});
const passwordRequired: Result<never> = err({
  code: APP_ERROR_CODE.INVALID_INPUT,
  details: { reason: "password_required" },
});
const passwordIncorrect: Result<never> = err({
  code: APP_ERROR_CODE.INVALID_INPUT,
  details: { reason: "password_incorrect" },
});
const noText: Result<never> = err({
  code: APP_ERROR_CODE.INVALID_INPUT,
  details: { reason: "no_text" },
});
const tooManyPages: Result<never> = err({
  code: APP_ERROR_CODE.INVALID_INPUT,
  details: { reason: "too_many_pages" },
});
const tooLarge: Result<never> = err({
  code: APP_ERROR_CODE.INVALID_INPUT,
  details: { reason: "too_large" },
});
const damaged: Result<never> = err({ code: APP_ERROR_CODE.PARSE_FAILED });

// pdf.js finds its worker module on `globalThis` and then runs it in the
// calling thread: the extraction worker in a browser, the process in Node.
// pdf.js's own worker would be a second worker, built from a URL the bundler
// doesn't follow.
type WorkerScope = { pdfjsWorker?: unknown };

let pdfjsLoading: Promise<typeof Pdfjs> | undefined;

// pdf.js loads with the first PDF: neither an Excel upload nor the server,
// which receives content already extracted, ever downloads it.
const loadPdfjs = (): Promise<typeof Pdfjs> => {
  pdfjsLoading ??= Promise.all([
    import("pdfjs-dist/legacy/build/pdf.mjs"),
    // pdf.js ships no types for its worker module, which only goes back to it.
    // @ts-expect-error -- untyped module: no declaration file
    import("pdfjs-dist/legacy/build/pdf.worker.mjs"),
  ]).then(
    ([pdfjs, worker]) => {
      // Safe: pdf.js alone reads this property, and expects the module there.
      (globalThis as WorkerScope).pdfjsWorker = worker;
      return pdfjs;
    },
    (error: unknown) => {
      // A download that failed can be tried again with the next file.
      pdfjsLoading = undefined;
      throw error;
    },
  );
  return pdfjsLoading;
};

/** Whether a file's bytes are a PDF's, by the header pdf.js looks for. */
export const isPdf = (bytes: Uint8Array): boolean => {
  const head = bytes.subarray(0, HEADER_SEARCH_BYTES + PDF_SIGNATURE.length);
  return head.some((_, start) =>
    PDF_SIGNATURE.every((byte, offset) => head[start + offset] === byte),
  );
};

// pdf.js rejects a file it can't open with a PasswordException whose code
// says why; anything else it throws means the file is damaged.
const failureOf = (error: unknown, pdfjs: typeof Pdfjs): Result<never> => {
  if (!(error instanceof pdfjs.PasswordException)) return damaged;
  return error.code === pdfjs.PasswordResponses.NEED_PASSWORD
    ? passwordRequired
    : passwordIncorrect;
};

const readPage = async (document: PdfDocument, pageNumber: number) => {
  const page = await document.getPage(pageNumber);
  const { transform } = page.getViewport({ scale: 1 });
  const { items } = await page.getTextContent();
  return toPdfPage(items, transform);
};

const readPages = async (document: PdfDocument): Promise<PdfContent> => ({
  type: "pdf",
  pages: await Promise.all(
    Array.from({ length: document.numPages }, (_, index) =>
      readPage(document, index + 1),
    ),
  ),
});

const checked = (content: PdfContent): Result<PdfContent> => {
  if (content.pages.every(({ items }) => items.length === 0)) return noText;
  // The bounds the server enforces, checked before anything leaves the browser.
  return extractedContentSchema.safeParse(content).success
    ? ok(content)
    : tooLarge;
};

/**
 * Reads a PDF's text into the content bank parsers read, the same way in a
 * browser worker and in Node: each page's upright text items, with where they
 * start and their baseline from the page's top left, their width and height.
 * An encrypted file opens only with its password, which goes nowhere else.
 * A file with more than `MAX_PDF_PAGES` pages is refused before its pages are
 * read, and one without text (a scanned statement) says so.
 */
export const extractPdf = async (
  bytes: Uint8Array,
  { password }: PdfExtractionOptions = {},
): Promise<Result<PdfContent>> => {
  if (!isPdf(bytes)) return unknownFileType;
  const pdfjs = await loadPdfjs();
  const task = pdfjs.getDocument({
    // pdf.js takes ownership of the bytes it gets; the caller keeps its own.
    data: bytes.slice(),
    password,
    verbosity: pdfjs.VerbosityLevel.ERRORS,
    // Only text is read: nothing is drawn, so no font, image decoder or
    // canvas is loaded, and nothing is fetched. A font the file doesn't embed
    // needs only its widths, which pdf.js knows.
    useSystemFonts: true,
    disableFontFace: true,
    useWasm: false,
    isOffscreenCanvasSupported: false,
    isImageDecoderSupported: false,
  });
  try {
    const document = await task.promise;
    if (document.numPages > MAX_PDF_PAGES) return tooManyPages;
    return checked(await readPages(document));
  } catch (error) {
    return failureOf(error, pdfjs);
  } finally {
    await task.destroy();
  }
};
