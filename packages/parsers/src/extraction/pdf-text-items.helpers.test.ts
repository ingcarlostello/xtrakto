import { describe, expect, it } from "vitest";
import { toPdfPage } from "./pdf-text-items.helpers";

// A letter-size page at scale 1, as pdf.js gives its viewport: the y axis
// turned down from the page's top.
const LETTER_VIEWPORT = [1, 0, 0, -1, 0, 792];

// Text at 8 points, upright, starting at (x, y) in the page's PDF space.
const textItem = (
  str: string,
  [x, y]: readonly [number, number],
  transform = [8, 0, 0, 8, x, y],
) => ({ str, transform, width: str.length * 4.8, height: 8 });

describe("toPdfPage", () => {
  it("places each item from the page's top left, at its baseline", () => {
    expect(toPdfPage([textItem("15/07", [50, 692])], LETTER_VIEWPORT)).toEqual({
      items: [{ str: "15/07", x: 50, y: 100, width: 24, height: 8 }],
    });
  });

  it("follows a page whose crop box starts elsewhere", () => {
    expect(
      toPdfPage([textItem("FECHA", [60, 702])], [1, 0, 0, -1, -10, 802]),
    ).toEqual({
      items: [{ str: "FECHA", x: 50, y: 100, width: 24, height: 8 }],
    });
  });

  it("joins letters written apart, as the bank's spreadsheets write them", () => {
    const apart = "Descripción".normalize("NFD");
    const [placed] = toPdfPage(
      [textItem(apart, [50, 692])],
      LETTER_VIEWPORT,
    ).items;

    expect(apart).not.toBe("Descripción");
    expect(placed?.str).toBe("Descripción");
  });

  it("rounds to hundredths of a point, without a negative zero", () => {
    const item = {
      str: "SALDO",
      // Just left of the page's edge, which rounds to a negative zero.
      transform: [8, 0, 0, 8, -0.001, 691.234567],
      width: 23.99999,
      height: 7.996,
    };

    expect(toPdfPage([item], LETTER_VIEWPORT)).toEqual({
      items: [{ str: "SALDO", x: 0, y: 100.77, width: 24, height: 8 }],
    });
    expect(Object.is(toPdfPage([item], LETTER_VIEWPORT).items[0]?.x, 0)).toBe(
      true,
    );
  });

  it("leaves out blank text and marked content", () => {
    expect(
      toPdfPage(
        [
          textItem("", [50, 692]),
          textItem("   ", [80, 692]),
          { type: "beginMarkedContent" },
          textItem("VALOR", [100, 692]),
        ],
        LETTER_VIEWPORT,
      ).items.map(({ str }) => str),
    ).toEqual(["VALOR"]);
  });

  it("leaves out text that isn't upright: rotated, mirrored or upside down", () => {
    expect(
      toPdfPage(
        [
          textItem("VIGILADO", [20, 400], [0, 8, -8, 0, 20, 400]),
          textItem("ESPEJO", [100, 600], [-8, 0, 0, 8, 100, 600]),
          textItem("INVERTIDO", [100, 500], [8, 0, 0, -8, 100, 500]),
        ],
        LETTER_VIEWPORT,
      ),
    ).toEqual({ items: [] });
  });
});
