import { describe, expect, it } from "vitest";
import { filesText } from "./your-data.helpers";

describe("filesText", () => {
  it.each([
    {
      files: { quarterly: 3, movements: 6 },
      text: "9 archivos: 3 trimestrales y 6 de movimientos.",
    },
    {
      files: { quarterly: 1, movements: 1 },
      text: "2 archivos: 1 trimestral y 1 de movimientos.",
    },
    { files: { quarterly: 2, movements: 0 }, text: "2 archivos trimestrales." },
    { files: { quarterly: 1, movements: 0 }, text: "1 archivo trimestral." },
    {
      files: { quarterly: 0, movements: 3 },
      text: "3 archivos de movimientos.",
    },
    { files: { quarterly: 0, movements: 0 }, text: "Aún no tienes archivos." },
  ])("counts $files.quarterly and $files.movements", ({ files, text }) => {
    expect(filesText(files)).toBe(text);
  });
});
