"use client";

import type { ReactNode } from "react";
import { ReviewGroupContext, useReviewGroup } from "../hooks/use-review-group";

type ReviewGroupItemProps = {
  isAnswered: boolean;
  /** The card that asks, or asks again. */
  open: ReactNode;
  /** The answered group's line; nothing until it's answered. */
  closed: ReactNode;
};

/**
 * A group of the quick review in its place: the server draws it open and
 * closed, and the user's answers and "Cambiar" switch between them.
 */
export function ReviewGroupItem({
  isAnswered,
  open,
  closed,
}: ReviewGroupItemProps) {
  const { isOpen, container, controls } = useReviewGroup(isAnswered);
  return (
    <ReviewGroupContext value={controls}>
      <div ref={container}>{isOpen ? open : closed}</div>
    </ReviewGroupContext>
  );
}
