import { describe, expect, it } from "vitest";
import {
  containsKeyword,
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
