import { describe, expect, it } from "vitest";
import { countText } from "./count-text.utils";

const MOVEMENTS = { one: "movimiento", other: "movimientos" };

describe("countText", () => {
  it.each([
    [0, "0 movimientos"],
    [1, "1 movimiento"],
    [33, "33 movimientos"],
    [1234, "1.234 movimientos"],
  ])("writes %i as %s", (count, expected) => {
    expect(countText(count, MOVEMENTS)).toBe(expected);
  });
});
