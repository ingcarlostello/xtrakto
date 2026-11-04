import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";

/**
 * A PDF's password field: what's typed, whether it shows, and the focus. The
 * field takes the focus when its form appears with nowhere else to have it
 * (the page, or the picker that chose the file), so the person types right
 * away; and again, its text selected, when a password they typed didn't open
 * the file. It never takes the focus from another field.
 */
export const usePasswordField = (
  isOpening: boolean,
  picker: RefObject<HTMLElement | null>,
) => {
  const form = useRef<HTMLFormElement>(null);
  const field = useRef<HTMLInputElement>(null);
  const [password, setPassword] = useState("");
  const [isShown, setIsShown] = useState(false);

  useEffect(() => {
    if (isOpening) return;
    const active = document.activeElement;
    const isFree =
      active === null ||
      active === document.body ||
      active === picker.current ||
      (form.current?.contains(active) ?? false);
    if (!isFree) return;
    field.current?.focus();
    field.current?.select();
  }, [isOpening, picker]);

  return {
    form,
    field,
    password,
    setPassword,
    isShown,
    toggleShown: () => setIsShown((shown) => !shown),
  };
};
