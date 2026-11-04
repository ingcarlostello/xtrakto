// @vitest-environment happy-dom
import { act } from "react";
import type { RefObject } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { usePasswordField } from "./use-password-field";

// A PDF's password form, as its row shows it.
function PasswordForm({
  isOpening,
  picker,
}: {
  isOpening: boolean;
  picker: RefObject<HTMLElement | null>;
}) {
  const { form, field, password, setPassword } = usePasswordField(
    isOpening,
    picker,
  );
  return (
    <form ref={form}>
      <input
        ref={field}
        aria-label="Contraseña del PDF"
        value={password}
        onChange={(event) => setPassword(event.currentTarget.value)}
      />
      <button type="submit">Abrir PDF</button>
    </form>
  );
}

let host: HTMLDivElement;
let root: Root;
let pickerButton: HTMLButtonElement;
let otherField: HTMLInputElement;
const picker: RefObject<HTMLElement | null> = { current: null };

const show = (isOpening: boolean) =>
  act(() =>
    root.render(<PasswordForm isOpening={isOpening} picker={picker} />),
  );

const passwordField = () => {
  const field = host.querySelector("input");
  if (!field) throw new Error("No field.");
  return field;
};

// As the person types: React hears the input's own value setter.
const type = (text: string) =>
  act(() => {
    const field = passwordField();
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )?.set?.call(field, text);
    field.dispatchEvent(new Event("input", { bubbles: true }));
  });

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  pickerButton = document.createElement("button");
  otherField = document.createElement("input");
  host = document.createElement("div");
  document.body.append(pickerButton, otherField, host);
  picker.current = pickerButton;
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  document.body.replaceChildren();
});

describe("usePasswordField", () => {
  it("takes the focus when its form appears with the focus nowhere", () => {
    show(false);

    expect(document.activeElement).toBe(passwordField());
  });

  it("takes it from the picker that chose the file", () => {
    pickerButton.focus();

    show(false);

    expect(document.activeElement).toBe(passwordField());
  });

  it("never takes it from another field", () => {
    otherField.focus();

    show(false);

    expect(document.activeElement).toBe(otherField);
  });

  it("takes it back, its text selected, when a typed password didn't open the file", () => {
    show(false);
    type("otra-clave");
    host.querySelector("button")?.focus();
    show(true);

    show(false);

    const field = passwordField();
    expect(document.activeElement).toBe(field);
    expect([field.selectionStart, field.selectionEnd]).toEqual([0, 10]);
  });
});
