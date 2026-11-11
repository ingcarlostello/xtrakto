// @vitest-environment happy-dom
import { amountMinorSchema, formatMappingSchema } from "@xtrakto/core";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MappingProposal } from "../format-mapping.types";
import { ConfirmFormatView } from "./ConfirmFormatView";

const MAPPING = formatMappingSchema.parse({
  header: ["FECHA", "DETALLE", "VALOR"],
  columns: ["date", "description", "amount"],
  dateOrder: "dmy",
  decimalSeparator: ",",
  bankId: "other",
});
const ZERO = amountMinorSchema.parse(0);

const PROPOSAL: MappingProposal = {
  mapping: MAPPING,
  review: {
    header: ["Fecha", "Detalle", "Valor"],
    rows: [
      {
        cells: ["01/09/2026", "SALDO ANTERIOR", null],
        kind: "balance",
        isOpening: true,
      },
      {
        cells: ["02/09/2026", "COMPRA EN TIENDA", "-85.400,00"],
        kind: "movement",
        isOpening: false,
      },
    ],
    openingRow: ["01/09/2026", "SALDO ANTERIOR", null],
    moreRows: 0,
    firstRow: 2,
    lastRow: 3,
    test: {
      movementCount: 1,
      moneyIn: { count: 0, totalMinor: ZERO },
      moneyOut: { count: 1, totalMinor: amountMinorSchema.parse(8_540_000) },
    },
  },
};

const onConfirm = vi.fn();
const onLeaveOut = vi.fn();
let root: Root;
let container: HTMLDivElement;

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  onConfirm.mockReset();
  onLeaveOut.mockReset();
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  act(() =>
    root.render(
      <ConfirmFormatView
        fileName="movimientos-sep.xlsx"
        proposal={PROPOSAL}
        onConfirm={onConfirm}
        onLeaveOut={onLeaveOut}
      />,
    ),
  );
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

const button = (name: string) =>
  [...container.querySelectorAll("button")].find(
    ({ textContent }) => textContent === name,
  );

const chooseBank = (bank: string) => {
  const select = container.querySelector("select");
  if (!select) throw new Error("No bank to choose.");
  act(() => {
    select.value = bank;
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
};

describe("ConfirmFormatView", () => {
  it("takes the focus to its title when it opens", () => {
    expect(document.activeElement?.textContent).toBe(
      "Confirma cómo leer tu extracto",
    );
  });

  it("shows the file's rows as it writes them, the opening balance crossed out", () => {
    const cells = [...container.querySelectorAll("tbody tr")].map((row) =>
      row.textContent?.trim(),
    );

    expect(cells).toEqual([
      "Saldo inicial, no es un movimiento: 01/09/2026SALDO ANTERIOR",
      "02/09/2026COMPRA EN TIENDA-85.400,00",
    ]);
    expect(container.textContent).toContain(
      "La fila “SALDO ANTERIOR” se usa como saldo inicial, no como movimiento.",
    );
  });

  it("waits for the bank before confirming, and says so", () => {
    const confirm = button("Confirmar y leer");

    expect(confirm?.getAttribute("aria-disabled")).toBe("true");
    expect(confirm?.getAttribute("aria-describedby")).toBe("format-bank-hint");
    act(() => confirm?.click());
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("confirms the mapping with the bank the person chose", () => {
    chooseBank("davivienda");
    act(() => button("Confirmar y leer")?.click());

    expect(onConfirm).toHaveBeenCalledWith({
      ...MAPPING,
      bankId: "davivienda",
    });
  });

  it("leaves the file out when something is wrong", () => {
    act(() => button("Algo está mal")?.click());

    expect(onLeaveOut).toHaveBeenCalledOnce();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
