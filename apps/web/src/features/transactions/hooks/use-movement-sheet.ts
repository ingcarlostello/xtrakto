import {
  type KeyboardEvent,
  useEffect,
  useLayoutEffect,
  useRef,
  useSyncExternalStore,
} from "react";
import { DETAIL_CLOSE_ATTRIBUTE } from "../transaction.constants";

// Below Tailwind's `lg`, where the detail covers the page.
const PHONE_QUERY = "(width < 64rem)";

const subscribeToWidth = (onChange: () => void) => {
  const query = window.matchMedia(PHONE_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};

// The server renders the wide layout; the browser reads its width.
const useIsPhone = (): boolean =>
  useSyncExternalStore(
    subscribeToWidth,
    () => window.matchMedia(PHONE_QUERY).matches,
    () => false,
  );

type SheetIds = {
  /** The heading the focus goes to when the detail opens. */
  readonly titleId: string;
  /** The movement's link in the list, which gets the focus back. */
  readonly rowId: string;
};

/**
 * A movement's detail as a dialog: shown beside the list on a wide screen,
 * and modal below `lg`, which makes the page behind it inert. The focus goes
 * to its title when it opens, and back to the movement's link when it
 * closes, by its link, Escape or the browser's Back.
 */
export const useMovementSheet = ({ titleId, rowId }: SheetIds) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const isModal = useRef(false);
  // Closing it to open it the other way isn't closing the detail.
  const isSwitching = useRef(false);
  const isPhone = useIsPhone();

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isModal.current !== isPhone) {
      isSwitching.current = true;
      dialog.close();
      if (isPhone) dialog.showModal();
      else dialog.show();
      isModal.current = isPhone;
    }
    document.getElementById(titleId)?.focus();
  }, [isPhone, titleId]);

  useEffect(() => () => document.getElementById(rowId)?.focus(), [rowId]);

  // Its link closes it: the list's URL without the movement.
  const close = () =>
    dialogRef.current
      ?.querySelector<HTMLElement>(`[${DETAIL_CLOSE_ATTRIBUTE}]`)
      ?.click();

  return {
    dialogRef,
    // Escape closes a modal dialog by itself; the URL follows.
    onClose: () => {
      if (isSwitching.current) isSwitching.current = false;
      else close();
    },
    onKeyDown: (event: KeyboardEvent) => {
      if (event.key !== "Escape" || isModal.current) return;
      event.preventDefault();
      close();
    },
  };
};
