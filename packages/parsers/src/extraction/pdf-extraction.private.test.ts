import { describe, expect, it } from "vitest";
import type { PdfContent } from "@xtrakto/core";
import { readPrivatePdfs } from "../../fixtures/private-exports.mjs";
import { extractPdf } from "./pdf-extraction.helpers";

// Real PDFs a developer copies into the git-ignored fixtures/private/ or its
// folders (Phase 9.1). Assertions and annotations hold only counts and error
// codes, so nothing prints a file's text, a name or a file name.

// Letters written apart (a letter and its combining accent), and ligatures
// drawn as one glyph ("ﬁ"), which would keep a text from matching the
// spreadsheet's.
const COMBINING_MARK = /\p{M}/u;
const LIGATURE = /[ﬀ-ﬆ]/u;

const files = await readPrivatePdfs();
const results = await Promise.all(files.map((bytes) => extractPdf(bytes)));
const contents: readonly PdfContent[] = results.flatMap((result) =>
  result.ok ? [result.value] : [],
);
const texts = contents.flatMap(({ pages }) =>
  pages.flatMap(({ items }) => items.map(({ str }) => str)),
);

describe.skipIf(files.length === 0)("real PDFs", () => {
  it("extracts every file", () => {
    expect(
      results.map((result) => (result.ok ? undefined : result.error)),
    ).toEqual(results.map(() => undefined));
  });

  it("reports their pages and text items", async ({ annotate }) => {
    const pageCounts = contents.map(({ pages }) => pages.length);
    const mostItems = Math.max(
      ...contents.flatMap(({ pages }) =>
        pages.map(({ items }) => items.length),
      ),
    );
    await annotate(
      `${contents.length} PDF de ${Math.min(...pageCounts)} a ${Math.max(...pageCounts)} páginas; hasta ${mostItems} fragmentos en una página`,
      "pdf",
    );

    expect(
      contents.every(({ pages }) =>
        pages.some(({ items }) => items.length > 0),
      ),
    ).toBe(true);
  });

  it("keeps no letters written apart and no ligatures", () => {
    expect(texts.filter((text) => COMBINING_MARK.test(text)).length).toBe(0);
    expect(texts.filter((text) => LIGATURE.test(text)).length).toBe(0);
  });
});
