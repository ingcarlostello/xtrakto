import { describe, expect, it } from "vitest";
import {
  compilePattern,
  containsKeyword,
  foldDescription,
  parseKeyword,
  startsWithWords,
  wordsOf,
} from "./rule-matching.helpers";

describe("wordsOf", () => {
  it.each([
    ["COMPRA EN BOLD*CAFE", ["COMPRA", "EN", "BOLD", "CAFE"]],
    ["INTERES INV VIRT *******7525", ["INTERES", "INV", "VIRT", "7525"]],
    ["PAGO PSE AIR-E S.A.S.", ["PAGO", "PSE", "AIR", "E", "S", "A", "S"]],
    ["IMPTO GOBIERNO 4X1000", ["IMPTO", "GOBIERNO", "4X1000"]],
    ["0", ["0"]],
  ])("splits %j into its words", (text, words) => {
    expect(wordsOf(text)).toEqual(words);
  });
});

describe("startsWithWords", () => {
  const words = wordsOf("TRANSF A PEDRO GOMEZ R");

  it("matches a prefix made of whole words", () => {
    expect(startsWithWords(words, ["TRANSF", "A"])).toBe(true);
  });

  it.each([["TRANSFERENCIAS A NEQUI"], ["TRANSF ABC"], ["PAGO TRANSF A"]])(
    "doesn't take %j for a TRANSF A",
    (text) => {
      expect(startsWithWords(wordsOf(text), ["TRANSF", "A"])).toBe(false);
    },
  );
});

describe("containsKeyword", () => {
  const contains = (text: string, keyword: string) =>
    containsKeyword(wordsOf(text), parseKeyword(keyword));

  it.each([
    ["PAGO PSE EMPRESA DE GAS DE CO", "GAS"],
    ["COMPRA EN DROGUERIA CENTRAL", "DROGUER*"],
    ["COMPRA EN DROGUER", "DROGUER*"],
    ["PAGO PSE EMPRESAS PUBLICAS DE", "EMPRESAS PUBLICAS"],
    ["PAGO PSE AIR-E", "AIR E"],
  ])("finds %j's %j", (text, keyword) => {
    expect(contains(text, keyword)).toBe(true);
  });

  it.each([
    // A whole word never matches inside another one.
    ["COMPRA EN GASOLINERA", "GAS"],
    ["PAGO PSE FUNES", "UNE"],
    ["PAGO PSE MENU", "NU"],
    // Nor does a stem, which only starts a word.
    ["COMPRA EN LA DROGUERIA", "ROGUER*"],
    // Words in a row must be consecutive.
    ["PAGO PSE EMPRESAS DE PUBLICAS", "EMPRESAS PUBLICAS"],
  ])("doesn't find %j's %j", (text, keyword) => {
    expect(contains(text, keyword)).toBe(false);
  });
});

describe("compilePattern", () => {
  const read = (pattern: Parameters<typeof compilePattern>[0], text: string) =>
    compilePattern(pattern)(foldDescription(text));

  it("takes a text that is exactly the pattern's", () => {
    expect(read({ is: "0" }, " 0 ")).toEqual(["0"]);
    expect(read({ is: "0" }, "0 COMISION")).toBeUndefined();
  });

  it("gives the words after the prefix, where it looks for keywords", () => {
    const pattern = { startsWith: ["PAGO PSE"], words: ["PSE"] };

    expect(read(pattern, "PAGO PSE PSE EJEMPLO")).toEqual(["PSE", "EJEMPLO"]);
    expect(read(pattern, "PAGO PSE EJEMPLO")).toBeUndefined();
  });

  it("looks for keywords anywhere without a prefix", () => {
    expect(read({ words: ["4X1000"] }, "IMPTO GOBIERNO 4X1000")).toEqual([
      "IMPTO",
      "GOBIERNO",
      "4X1000",
    ]);
  });

  it("folds the description before reading it", () => {
    expect(read({ startsWith: ["TRANSF A"] }, "Transf  a Ana Pérez")).toEqual([
      "ANA",
      "PEREZ",
    ]);
  });
});
