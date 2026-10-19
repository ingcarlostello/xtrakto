// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MovementSheet } from "../components/MovementSheet";

// The list's link to a movement and, while the URL asks, its detail with
// its title and the link that closes it.
function Page({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <>
      <a id="movement-m1" href="#m1">
        PAGO PSE EMPRESA DE ENERGIA
      </a>
      {isOpen && (
        <MovementSheet titleId="detail-title" rowId="movement-m1">
          <h2 id="detail-title" tabIndex={-1}>
            PAGO PSE EMPRESA DE ENERGIA
          </h2>
          <a
            href="#list"
            data-detail-close=""
            onClick={(event) => {
              event.preventDefault();
              onClose();
            }}
          >
            Cerrar el detalle
          </a>
        </MovementSheet>
      )}
    </>
  );
}

let host: HTMLDivElement;
let root: Root;
const closed = vi.fn();

const widthIs = (isPhone: boolean) =>
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: (media: string) => ({
      matches: isPhone,
      media,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }),
  });

const show = (isOpen: boolean) =>
  act(() => root.render(<Page isOpen={isOpen} onClose={closed} />));

const dialog = () => {
  const element = host.querySelector("dialog");
  if (!element) throw new Error("No detail.");
  return element;
};

beforeEach(() => {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  closed.mockClear();
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.restoreAllMocks();
});

describe("useMovementSheet", () => {
  it("opens beside the list on a wide screen, with the focus on its title", () => {
    widthIs(false);
    const modal = vi.spyOn(HTMLDialogElement.prototype, "showModal");

    show(true);

    expect(dialog().open).toBe(true);
    expect(modal).not.toHaveBeenCalled();
    expect(document.activeElement?.id).toBe("detail-title");
  });

  it("covers the page as a modal on a phone, without closing the detail", () => {
    widthIs(true);
    const modal = vi.spyOn(HTMLDialogElement.prototype, "showModal");

    show(true);

    expect(modal).toHaveBeenCalledOnce();
    expect(dialog().open).toBe(true);
    expect(closed).not.toHaveBeenCalled();
    expect(document.activeElement?.id).toBe("detail-title");
  });

  it("closes by its link on Escape on a wide screen", () => {
    widthIs(false);
    show(true);

    act(() => {
      document.activeElement?.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      );
    });

    expect(closed).toHaveBeenCalledOnce();
  });

  it("follows its link when a phone closes it, as Escape does", () => {
    widthIs(true);
    show(true);

    act(() => dialog().close());

    expect(closed).toHaveBeenCalledOnce();
  });

  it("gives the focus back to the movement once it closes", () => {
    widthIs(false);
    show(true);

    show(false);

    expect(document.activeElement?.id).toBe("movement-m1");
  });
});
