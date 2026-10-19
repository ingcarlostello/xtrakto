import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

/** What a group's parts ask of it: open again with "Cambiar", or close. */
export type ReviewGroupControls = {
  readonly change: () => void;
  readonly close: () => void;
};

export const ReviewGroupContext = createContext<ReviewGroupControls | null>(
  null,
);

/** The controls of the group a part sits in; `null` outside one. */
export const useReviewGroupControls = () => useContext(ReviewGroupContext);

// What the focus lands on when a group opens or closes: the open card's
// question, or the answered group itself.
const FOCUS_TARGET = "[data-review-focus]";

/**
 * A group of the quick review: open while it waits for an answer or while
 * the user changes one, closed once answered. When it opens or closes
 * because of the user, the focus moves to what it shows now, so it stays on
 * the group; a group loaded already answered takes no focus.
 */
export const useReviewGroup = (isAnswered: boolean) => {
  const [isChanging, setIsChanging] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const shouldFocus = useRef(false);
  const wasAnswered = useRef(isAnswered);

  useEffect(() => {
    const isJustAnswered = isAnswered && !wasAnswered.current;
    wasAnswered.current = isAnswered;
    if (!isJustAnswered && !shouldFocus.current) return;
    shouldFocus.current = false;
    container.current?.querySelector<HTMLElement>(FOCUS_TARGET)?.focus();
  }, [isAnswered, isChanging]);

  const controls = useMemo<ReviewGroupControls>(() => {
    const show = (isOpen: boolean) => {
      shouldFocus.current = true;
      setIsChanging(isOpen);
    };
    return { change: () => show(true), close: () => show(false) };
  }, []);

  return { isOpen: !isAnswered || isChanging, container, controls };
};
