import { describe, expect, it } from "vitest";
import { noticesOf, uploadNoticeEmail } from "./upload-notice-email.helpers";

const UNSUBSCRIBE = "https://xtrakto.site/unsubscribe?token=abc";
const email = (files: number, failed: number, added: number) =>
  uploadNoticeEmail({ files: { files, failed, added } }, UNSUBSCRIBE);

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

  describe("with what else the upload brought", () => {
    const FILES = { files: 1, failed: 0, added: 3 };
    const REVIEW = {
      pending: { groups: 4, movements: 24 },
      url: "https://xtrakto.site/review?account=a&period=2026-Q3",
    };
    const RISEN = { count: 1, url: "https://xtrakto.site/recurring?account=a" };

    it("says what waits for review, with its way there", () => {
      const { text, html } = uploadNoticeEmail(
        { files: FILES, review: REVIEW },
        UNSUBSCRIBE,
      );

      for (const body of [text, html]) {
        expect(body).toContain("Tienes 4 grupos por revisar (24 movimientos)");
        expect(body).toContain("Revisar ahora");
        expect(body).toContain(REVIEW.url);
      }
    });

    it.each([
      [1, "Un pago fijo subió", "para ver cuál y cuánto"],
      [2, "2 pagos fijos subieron", "para ver cuáles y cuánto"],
    ])("says %i fixed payments rose, and no more", (count, title, line) => {
      const { text } = uploadNoticeEmail(
        { files: FILES, risen: { ...RISEN, count } },
        UNSUBSCRIBE,
      );

      expect(text).toContain(title);
      expect(text).toContain(line);
      expect(text).toContain(RISEN.url);
    });

    it("leads with the files, when their notice is on", () => {
      const { subject, html } = uploadNoticeEmail(
        { files: FILES, review: REVIEW, risen: RISEN },
        UNSUBSCRIBE,
      );

      expect(subject).toBe("Tu archivo está listo");
      expect(html.match(/border-radius:999px/g)).toHaveLength(1);
    });

    it("leads with what it has, when the files' notice is off", () => {
      expect(
        uploadNoticeEmail({ review: REVIEW, risen: RISEN }, UNSUBSCRIBE)
          .subject,
      ).toBe("Tienes 4 grupos por revisar (24 movimientos)");
      expect(uploadNoticeEmail({ risen: RISEN }, UNSUBSCRIBE).subject).toBe(
        "Un pago fijo subió",
      );
    });

    it("names one notice or several in its way out", () => {
      expect(uploadNoticeEmail({ files: FILES }, UNSUBSCRIBE).text).toContain(
        "Dejar de recibir este aviso",
      );
      expect(
        uploadNoticeEmail({ files: FILES, risen: RISEN }, UNSUBSCRIBE).text,
      ).toContain("Dejar de recibir estos avisos");
    });

    it("knows which notices it carries", () => {
      expect(noticesOf({ files: FILES, risen: RISEN })).toEqual([
        "uploadReady",
        "fixedPaymentRose",
      ]);
      expect(noticesOf({ review: REVIEW })).toEqual(["reviewWaiting"]);
      expect(noticesOf({})).toEqual([]);
    });

    it("refuses to be written with nothing to say", () => {
      expect(() => uploadNoticeEmail({}, UNSUBSCRIBE)).toThrow(RangeError);
    });
  });
});
