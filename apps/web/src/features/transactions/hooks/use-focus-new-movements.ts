import { useEffect, useRef } from "react";
import { MOVEMENT_ROW_ATTRIBUTE } from "../transaction.constants";

/**
 * After "Mostrar 30 más", moves the focus to the first movement it brought,
 * so a keyboard or screen reader user goes on reading there, even once the
 * link is gone because every movement shows. Call `markLoading` when the
 * link is pressed; the list's container is found from the footer's ref.
 */
export const useFocusNewMovements = (shown: number) => {
  const footerRef = useRef<HTMLDivElement>(null);
  const loadedFrom = useRef<number | null>(null);

  useEffect(() => {
    const from = loadedFrom.current;
    if (from === null || shown <= from) return;
    loadedFrom.current = null;
    const rows =
      footerRef.current?.parentElement?.querySelectorAll<HTMLElement>(
        `[${MOVEMENT_ROW_ATTRIBUTE}]`,
      );
    const firstNew = rows?.[from];
    if (!firstNew) return;
    firstNew.tabIndex = -1;
    firstNew.focus();
  }, [shown]);

  const markLoading = () => {
    loadedFrom.current = shown;
  };

  return { footerRef, markLoading };
};
