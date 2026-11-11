import { describe, expect, it } from "vitest";
import { filesText } from "./your-data.helpers";

const bancolombia = (withBalances: number, withoutBalances: number) => ({
  bankId: "bancolombia",
  withBalances,
  withoutBalances,
});

describe("filesText", () => {
  it.each([
    {
      files: [bancolombia(3, 6)],
      text: "9 archivos: 3 trimestrales y 6 de movimientos.",
    },
    {
      files: [bancolombia(1, 1)],
      text: "2 archivos: 1 trimestral y 1 de movimientos.",
    },
    { files: [bancolombia(2, 0)], text: "2 archivos trimestrales." },
    { files: [bancolombia(1, 0)], text: "1 archivo trimestral." },
    { files: [bancolombia(0, 3)], text: "3 archivos de movimientos." },
    { files: [], text: "Aún no tienes archivos." },
  ])("counts Bancolombia's files: $text", ({ files, text }) => {
    expect(filesText(files)).toBe(text);
  });

  it("counts another bank's files apart, with balances or without", () => {
    const davivienda = {
      bankId: "davivienda",
      withBalances: 1,
      withoutBalances: 1,
    };
    const other = { bankId: "other", withBalances: 0, withoutBalances: 1 };

    expect(filesText([bancolombia(3, 6), davivienda, other])).toBe(
      "12 archivos: 3 trimestrales, 6 de movimientos y 3 de otros bancos.",
    );
    expect(filesText([davivienda])).toBe("2 archivos de otros bancos.");
  });
});
