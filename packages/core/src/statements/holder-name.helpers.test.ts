import { describe, expect, it } from "vitest";
import { normalizeHolderName } from "./holder-name.helpers";

describe("normalizeHolderName", () => {
  it.each([
    ["Ana  Pérez Muñoz", "ANA PEREZ MUNOZ"],
    ["  ANA PRUEBA ", "ANA PRUEBA"],
    // A decomposed accent, as some systems write it.
    ["José Niño", "JOSE NINO"],
  ])("writes %j as %j", (name, expected) => {
    expect(normalizeHolderName(name)).toBe(expected);
  });
});
