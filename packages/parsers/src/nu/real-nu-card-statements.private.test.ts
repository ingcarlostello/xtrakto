import { describe, expect, it } from "vitest";
import type { PdfContent } from "@xtrakto/core";
import { readPrivateNuCardPdfs } from "../../fixtures/private-exports.mjs";
import { extractPdf } from "../extraction/pdf-extraction.helpers";
import type { PdfLine, PdfSegment } from "../pdf-layout/pdf-layout.types";
import { pdfLines } from "../pdf-layout/pdf-lines.helpers";
import { reconcile } from "../reconciliation/reconciliation.helpers";
import { comparableText } from "../sheets/sheet.utils";
import { minimizeNuCard } from "./nu-card-minimize.helpers";
import { nuCardPdfParser } from "./nu-card-parser.helpers";

// The human's Nu card statements, in the git-ignored
// fixtures/private/tarjeta-nu/ (Stage 12), locked with their ID number, which
// reaches this test only as the environment variable NU_PDF_PASSWORD when the
// human runs it, never from a file; without it the test is skipped.
// Assertions only compare counts, codes and yes/no answers, so a failure
// never prints a value of them.

const LONG_NUMBER = /\d{6,}/;
// Amounts as Nu writes them, whose digits aren't a number to hide.
const AMOUNT = /\d{1,3}(?:\.\d{3})+,\d+/g;

// Read only here, by a test Turborepo never runs (`test:private`), so no
// task declares it, and no task gets the password.
// eslint-disable-next-line turbo/no-undeclared-env-vars
const password = process.env["NU_PDF_PASSWORD"];
const files = password === undefined ? [] : await readPrivateNuCardPdfs();
const contents = await Promise.all(
  files.map(async (bytes) => {
    const content = await extractPdf(bytes, { password });
    return content.ok ? content.value : undefined;
  }),
);

const startsWith = (segment: PdfSegment, label: string): boolean =>
  comparableText(segment.text).startsWith(comparableText(label));

const labeled = (lines: readonly PdfLine[], label: string) =>
  lines.flatMap(({ segments }) => segments).find((s) => startsWith(s, label));

// The first page's texts the parser never reads: those left of the cards'
// column over the dates but the holder's name (the greeting, the ID number,
// the address), and the virtual card's digits under its label.
const unreadTexts = (content: PdfContent): string[] => {
  const front = pdfLines(content).filter(({ page }) => page === 0);
  const cards = labeled(front, "Tus tarjetas");
  const virtual = labeled(front, "Tarjeta virtual");
  const dates = front.findIndex(({ segments }) =>
    segments.some((segment) => startsWith(segment, "Fecha límite de pago")),
  );
  if (cards === undefined || virtual === undefined || dates === -1) return [];
  const holderLine = front.find(({ segments }) => segments.includes(cards));
  const holder = holderLine?.segments[holderLine.segments.indexOf(cards) - 1];
  const left = front
    .slice(0, dates)
    .flatMap(({ segments }) => segments)
    .filter((segment) => segment.right < cards.left && segment !== holder);
  const digits = front
    .flatMap(({ segments }) => segments)
    .find((segment) => segment.left === virtual.left && segment !== virtual);
  return [...left, ...(digits === undefined ? [] : [digits])].map(
    ({ text }) => text,
  );
};

describe.skipIf(contents.length === 0)("the human's Nu card statements", () => {
  it("extracts and recognizes every file", () => {
    expect(
      contents.filter(
        (content) =>
          content === undefined || !nuCardPdfParser.canParse(content),
      ).length,
    ).toBe(0);
  });

  it("parses each without warnings and reconciles it to the cent", () => {
    for (const content of contents) {
      const statement =
        content === undefined ? undefined : nuCardPdfParser.parse(content);
      expect(statement?.ok).toBe(true);
      if (!statement?.ok) continue;
      expect(statement.value.warnings.length).toBe(0);
      expect(reconcile(statement.value).issues.map(({ code }) => code)).toEqual(
        [],
      );
    }
  });

  it("parses each minimized exactly as the original, minimized once and for all", () => {
    const different = contents.filter((content) => {
      if (content === undefined) return false;
      const minimized = minimizeNuCard(content);
      return (
        JSON.stringify(nuCardPdfParser.parse(minimized)) !==
          JSON.stringify(nuCardPdfParser.parse(content)) ||
        JSON.stringify(minimizeNuCard(minimized)) !== JSON.stringify(minimized)
      );
    });

    expect(different.length).toBe(0);
  });

  it("sends neither the greeting, the ID number, the address nor the virtual card, nor a long number", () => {
    for (const content of contents) {
      if (content?.type !== "pdf") continue;
      const unread = unreadTexts(content);
      const sent = JSON.stringify(minimizeNuCard(content));

      expect(unread.length).toBeGreaterThan(0);
      expect(unread.filter((text) => sent.includes(text)).length).toBe(0);
      expect(LONG_NUMBER.test(sent.replaceAll(AMOUNT, ""))).toBe(false);
    }
  });
});
