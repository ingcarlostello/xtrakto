// @vitest-environment happy-dom
import {
  amountMinorSchema,
  APP_ERROR_CODE,
  err,
  formatMappingSchema,
  ok,
  ROLES_PROBLEM,
} from "@xtrakto/core";
import type { MappingReview } from "@xtrakto/parsers";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NO_PROPOSAL } from "../format-confirmation.constants";
import type { FormatConfirmation } from "../format-mapping.types";
import { ConfirmFormatView } from "./ConfirmFormatView";

const MAPPING = formatMappingSchema.parse({
  header: ["FECHA", "DETALLE", "VALOR"],
  columns: ["date", "description", "amount"],
  dateOrder: "dmy",
  decimalSeparator: ",",
  bankId: "other",
});
const ZERO = amountMinorSchema.parse(0);

const REVIEW: MappingReview = {
  header: ["Fecha", "Detalle", "Valor"],
  names: MAPPING.header,
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
  roles: MAPPING.columns,
  dateOrder: "dmy",
  decimalSeparator: ",",
  reading: ok({
    mapping: MAPPING,
    test: {
      movementCount: 1,
      moneyIn: { count: 0, totalMinor: ZERO },
      moneyOut: { count: 1, totalMinor: amountMinorSchema.parse(8_540_000) },
    },
  }),
};

const CONFIRMATION: FormatConfirmation = {
  review: REVIEW,
  choices: { roles: MAPPING.columns },
  revision: 0,
  isRereading: false,
};

const onCorrect = vi.fn();
const onConfirm = vi.fn();
const onLeaveOut = vi.fn();
let root: Root;
let container: HTMLDivElement;

const render = (confirmation = CONFIRMATION) =>
  act(() =>
    root.render(
      <ConfirmFormatView
        fileName="movimientos-sep.xlsx"
        confirmation={confirmation}
        onCorrect={onCorrect}
        onConfirm={onConfirm}
        onLeaveOut={onLeaveOut}
      />,
    ),
  );

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  onCorrect.mockReset();
  onConfirm.mockReset();
  onLeaveOut.mockReset();
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  render();
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

const button = (name: string) =>
  [...container.querySelectorAll("button")].find(
    ({ textContent }) => textContent === name,
  );

// A select by its accessible name: its own label, or the one it's for.
const select = (name: string) => {
  const found = [...container.querySelectorAll("select")].find(
    (each) =>
      each.getAttribute("aria-label") === name ||
      container.querySelector(`label[for="${each.id}"]`)?.textContent === name,
  );
  if (!found) throw new Error(`No select named ${name}.`);
  return found;
};

const choose = (field: HTMLSelectElement, value: string) =>
  act(() => {
    field.value = value;
    field.dispatchEvent(new Event("change", { bubbles: true }));
  });

const options = (field: HTMLSelectElement) =>
  [...field.options].map(({ textContent }) => textContent);

const chooseBank = (bank: string) => {
  const field = container.querySelector<HTMLSelectElement>("#format-bank");
  if (!field) throw new Error("No bank to choose.");
  choose(field, bank);
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

  it("offers each column the roles the others leave it", () => {
    expect(options(select("Qué es la columna Fecha"))).toEqual([
      "Fecha",
      "Saldo",
      "Referencia",
      "Entra o sale",
      "Ignorar",
    ]);
  });

  it("reads the file again with a column's new role", () => {
    choose(select("Qué es la columna Valor"), "none");

    expect(onCorrect).toHaveBeenCalledWith({
      roles: ["date", "description", "none"],
    });
  });

  it("reads the file again with the numbers' or the dates' new format", () => {
    choose(select("Fechas"), "mdy");
    choose(select("Números"), ".");

    expect(onCorrect.mock.calls).toEqual([
      [{ roles: MAPPING.columns, dateOrder: "mdy" }],
      [{ roles: MAPPING.columns, decimalSeparator: "." }],
    ]);
    expect(container.textContent).toContain("Empieza enfila 2");
  });

  it("waits for the bank before confirming, and says so", () => {
    const confirm = button("Confirmar y leer");

    expect(confirm?.getAttribute("aria-disabled")).toBe("true");
    expect(confirm?.getAttribute("aria-describedby")).toBe(
      "format-confirm-hint",
    );
    expect(container.querySelector("#format-confirm-hint")?.textContent).toBe(
      "Elige el banco para seguir.",
    );
    act(() => confirm?.click());
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("confirms the mapping the choices make with the bank the person chose", () => {
    chooseBank("davivienda");
    act(() => button("Confirmar y leer")?.click());

    expect(onConfirm).toHaveBeenCalledWith({
      ...MAPPING,
      bankId: "davivienda",
    });
  });

  it("waits for a reading of the whole file, and says what to change", () => {
    const reading = err({
      code: APP_ERROR_CODE.PARSE_FAILED,
      details: { reason: "invalid_mapping", cause: ROLES_PROBLEM.DESCRIPTION },
    });
    const rows = REVIEW.rows.map(({ cells, isOpening }) => ({
      cells,
      isOpening,
    }));
    render({ ...CONFIRMATION, review: { ...REVIEW, rows, reading } });
    chooseBank("davivienda");
    act(() => button("Confirmar y leer")?.click());

    expect(onConfirm).not.toHaveBeenCalled();
    expect(container.textContent).toContain(
      "Faltan columnas por elegirElige qué columna tiene la descripción.",
    );
    expect(container.querySelector("#format-confirm-hint")?.textContent).toBe(
      "Corrige lo que no se lee para seguir.",
    );
    expect(container.querySelector(".line-through")).toBeNull();
  });

  it("waits while a correction is read", () => {
    render({ ...CONFIRMATION, isRereading: true });
    chooseBank("davivienda");
    act(() => button("Confirmar y leer")?.click());

    expect(onConfirm).not.toHaveBeenCalled();
    expect(container.textContent).toContain("Leyendo tu archivo de nuevo…");
  });

  it("says why there's no proposal, and asks for the columns", () => {
    render({ ...CONFIRMATION, noProposal: NO_PROPOSAL.AI_OFF });

    expect(container.textContent).toContain(
      "No conocíamos este formato. Dinos cómo leerlo: es un minuto y solo esta vez.",
    );
    expect(container.textContent).toContain(
      "Dinos qué es cada columnaAhora no podemos proponer qué es cada columna. Encontramos la fecha: elige qué es cada una de las otras.",
    );
    expect(container.textContent).toContain(
      "Tú dices qué es cada columna y la app hace las cuentas.",
    );
  });

  it("leaves the file out when something is wrong", () => {
    act(() => button("Algo está mal")?.click());

    expect(onLeaveOut).toHaveBeenCalledOnce();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
