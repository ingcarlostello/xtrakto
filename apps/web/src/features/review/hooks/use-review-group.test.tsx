// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ReviewGroupItem } from "../components/ReviewGroupItem";
import { useReviewGroupControls } from "./use-review-group";

// A group's open card and answered line as the review draws them: each
// marks what takes the focus, and their buttons use the group's controls.
function OpenCard() {
  const controls = useReviewGroupControls();
  return (
    <section>
      <h2 tabIndex={-1} data-review-focus="">
        ¿Qué son estos pagos con llave?
      </h2>
      <button type="button" onClick={controls?.close}>
        Mantener mi respuesta
      </button>
    </section>
  );
}

function AnsweredLine() {
  const controls = useReviewGroupControls();
  return (
    <div role="group" tabIndex={-1} data-review-focus="">
      Compras: 1 movimiento cuenta como gasto real.
      <button type="button" onClick={controls?.change}>
        Cambiar
      </button>
    </div>
  );
}

let host: HTMLDivElement;
let root: Root;

const show = (isAnswered: boolean) =>
  act(() =>
    root.render(
      <ReviewGroupItem
        isAnswered={isAnswered}
        open={<OpenCard />}
        closed={<AnsweredLine />}
      />,
    ),
  );

const press = (label: string) =>
  act(() => {
    const button = [...host.querySelectorAll("button")].find(
      ({ textContent }) => textContent === label,
    );
    if (!button) throw new Error(`No button "${label}".`);
    button.click();
  });

// What holds the focus: the answered group, the question, or nothing.
const answeredLine = () => host.querySelector('[role="group"]');
const question = () => host.querySelector("h2");

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe("useReviewGroup", () => {
  it("closes a group once it's answered, and keeps the focus on it", () => {
    show(false);
    const before = document.activeElement;

    show(true);

    expect(before).toBe(document.body);
    expect(answeredLine()).not.toBeNull();
    expect(document.activeElement).toBe(answeredLine());
  });

  it("takes no focus for a group that loads answered", () => {
    show(true);

    expect(answeredLine()).not.toBeNull();
    expect(document.activeElement).toBe(document.body);
  });

  it('asks again with "Cambiar", with the focus on the question, and closes unchanged', () => {
    show(true);

    press("Cambiar");
    const asking = document.activeElement;
    const asked = question();
    press("Mantener mi respuesta");

    expect(asked).not.toBeNull();
    expect(asking).toBe(asked);
    expect(question()).toBeNull();
    expect(document.activeElement).toBe(answeredLine());
  });
});
