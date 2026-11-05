import { describe, expect, it } from "vitest";
import { joinedFilesText } from "./joined-files.helpers";

describe("joinedFilesText", () => {
  it.each([
    {
      files: { quarterly: 1, movements: 2 },
      text: "Juntamos tu extracto trimestral y 2 archivos de movimientos, sin duplicar.",
    },
    {
      files: { quarterly: 1, movements: 1 },
      text: "Juntamos tu extracto trimestral y 1 archivo de movimientos, sin duplicar.",
    },
    {
      files: { quarterly: 0, movements: 3 },
      text: "Juntamos 3 archivos de movimientos, sin duplicar.",
    },
    {
      files: { quarterly: 2, movements: 5 },
      text: "Juntamos 2 extractos trimestrales y 5 archivos de movimientos, sin duplicar.",
    },
  ])(
    "names the files it joined: $files.quarterly and $files.movements",
    ({ files, text }) => {
      expect(joinedFilesText(files)).toBe(text);
    },
  );

  it.each([
    { quarterly: 0, movements: 0 },
    { quarterly: 1, movements: 0 },
    { quarterly: 0, movements: 1 },
    { quarterly: 2, movements: 0 },
  ])(
    "says nothing with one file, or quarterly statements alone: $quarterly and $movements",
    (files) => {
      expect(joinedFilesText(files)).toBeUndefined();
    },
  );
});
