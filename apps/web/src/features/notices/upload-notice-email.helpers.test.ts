import { describe, expect, it } from "vitest";
import { uploadNoticeEmail } from "./upload-notice-email.helpers";

const UNSUBSCRIBE = "https://xtrakto.site/unsubscribe?token=abc";
const email = (files: number, failed: number, added: number) =>
  uploadNoticeEmail({ files, failed, added }, UNSUBSCRIBE);

describe("uploadNoticeEmail", () => {
  it.each<[[number, number, number], string, string]>([
    [
      [1, 0, 1],
      "Tu archivo está listo",
      "Leímos tu archivo y guardamos 1 movimiento nuevo.",
    ],
    [
      [1, 0, 48],
      "Tu archivo está listo",
      "Leímos tu archivo y guardamos 48 movimientos nuevos.",
    ],
    [
      [1, 0, 0],
      "Tu archivo está listo",
      "Leímos tu archivo. Ya tenías todos sus movimientos.",
    ],
    [
      [3, 0, 1234],
      "Tus archivos están listos",
      "Leímos 3 archivos y guardamos 1.234 movimientos nuevos.",
    ],
    [
      [3, 1, 7],
      "Tus archivos están listos",
      "Leímos 2 archivos y guardamos 7 movimientos nuevos.",
    ],
    [
      [2, 1, 0],
      "Tus archivos están listos",
      "Leímos 1 archivo. Ya tenías todos sus movimientos.",
    ],
    [
      [1, 1, 0],
      "No pudimos leer tu archivo",
      "Entra a Xtrakto para ver qué pasó y qué puedes hacer.",
    ],
    [
      [2, 2, 0],
      "No pudimos leer tus archivos",
      "Entra a Xtrakto para ver qué pasó y qué puedes hacer.",
    ],
  ])(
    "for %i files, %i failed and %i new",
    ([files, failed, added], subject, line) => {
      const { subject: written, html, text } = email(files, failed, added);

      expect(written).toBe(subject);
      expect(text).toContain(line);
      expect(html).toContain(line);
    },
  );

  it.each([
    [3, 1, "1 archivo no se pudo leer."],
    [4, 2, "2 archivos no se pudieron leer."],
  ])("says how many of %i files failed", (files, failed, line) => {
    expect(email(files, failed, 5).text).toContain(line);
  });

  it("carries the result's link and its way out, in HTML and in text", () => {
    const { html, text } = email(1, 0, 3);

    for (const body of [html, text]) {
      expect(body).toContain("https://xtrakto.site/upload");
      expect(body).toContain(UNSUBSCRIBE);
    }
  });

  it("shows the logo at the brand's width, from a file email clients read", () => {
    expect(email(1, 0, 3).html).toContain(
      'src="https://xtrakto.site/brand/png/xtrakto-logo-horizontal.png" width="160" alt="Xtrakto"',
    );
  });

  it("holds no figure but the counts it was given", () => {
    const { text } = email(3, 1, 7);

    expect(text.match(/\d[\d.]*/g)).toEqual(["2", "7", "1"]);
  });
});
