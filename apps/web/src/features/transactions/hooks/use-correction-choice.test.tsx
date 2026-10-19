// @vitest-environment happy-dom
import type { CategoryId, CategoryKind } from "@xtrakto/core";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useCorrectionChoice } from "./use-correction-choice";

let host: HTMLDivElement;
let root: Root;

// The choice as a form shows it, and two of the user's choices: the kind
// "Movido" and the category "Mercado".
function Form(saved: { kind: CategoryKind; categoryId: CategoryId | null }) {
  const { kind, category, chooseKind, chooseCategory } =
    useCorrectionChoice(saved);
  return (
    <>
      <output data-kind={kind} data-category={category ?? ""} />
      <button type="button" onClick={() => chooseKind("internal")}>
        Movido
      </button>
      <button type="button" onClick={() => chooseCategory("groceries")}>
        Mercado
      </button>
    </>
  );
}

const show = (kind: CategoryKind, categoryId: CategoryId | null) =>
  act(() => root.render(<Form kind={kind} categoryId={categoryId} />));

const press = (label: string) =>
  act(() => {
    [...host.querySelectorAll("button")]
      .find(({ textContent }) => textContent === label)
      ?.click();
  });

const shown = () => {
  const output = host.querySelector("output");
  return [output?.dataset.kind, output?.dataset.category];
};

beforeEach(() => {
  host = document.createElement("div");
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
});

describe("useCorrectionChoice", () => {
  it("starts on what the movement counts as, and a kind starts its categories", () => {
    show("spending", "transfers_to_people");
    expect(shown()).toEqual(["spending", "transfers_to_people"]);

    press("Movido");

    expect(shown()).toEqual(["internal", "own_account_transfer"]);
  });

  it("keeps the user's choice while the page brings the same category", () => {
    show("spending", "transfers_to_people");
    press("Mercado");

    show("spending", "transfers_to_people");

    expect(shown()).toEqual(["spending", "groceries"]);
  });

  // As when its Nequi number becomes the user's from the detail (6.3h).
  it("shows the category the page brings once it changes", () => {
    show("spending", "transfers_to_people");
    press("Mercado");

    show("internal", "own_account_transfer");

    expect(shown()).toEqual(["internal", "own_account_transfer"]);
  });
});
