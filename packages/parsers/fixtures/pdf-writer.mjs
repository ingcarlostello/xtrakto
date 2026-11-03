// Writes extracted PDF content back as a PDF, for the extraction's tests.
// Plain JavaScript (pdfkit runs in Node); pdf-writer.d.mts gives it a type.
// Invented content only.
import { Buffer } from "node:buffer";
import PDFDocument from "pdfkit";

// Courier, the quarterly statement's font: each character takes 0.6 of the
// font size, so an item's width follows from its text.
const FONT = "Courier";
const PAGE = { size: "LETTER", margin: 0 };
const PAGE_SIZE = { width: 612, height: 792 };
// A one-pixel image, stretched over a page as a scanner would leave it.
const SCAN = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

// With a password, the file is encrypted with AES-256, which pdf.js opens.
const newDocument = (userPassword) =>
  new PDFDocument({
    autoFirstPage: false,
    ...(userPassword === undefined
      ? {}
      : { userPassword, ownerPassword: userPassword, pdfVersion: "1.7ext3" }),
  });

const toBytes = (document) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    document.on("data", (chunk) => chunks.push(chunk));
    document.on("end", () => resolve(new Uint8Array(Buffer.concat(chunks))));
    document.on("error", reject);
    document.end();
  });

export const contentToPdf = (content, { userPassword } = {}) => {
  const document = newDocument(userPassword);
  for (const { items } of content.pages) {
    document.addPage(PAGE);
    for (const { str, x, y, height } of items)
      document
        .font(FONT)
        .fontSize(height)
        .text(str, x, y, { lineBreak: false, baseline: "alphabetic" });
  }
  return toBytes(document);
};

export const scannedPdf = (pageCount = 1) => {
  const document = newDocument();
  for (let page = 0; page < pageCount; page += 1) {
    document.addPage(PAGE);
    document.image(SCAN, 0, 0, PAGE_SIZE);
  }
  return toBytes(document);
};
