"use client";

import { Button } from "@/components/ui/button";
import { useReviewGroupControls } from "../hooks/use-review-group";
import { REVIEW_COPY } from "../review.constants";

/** "Cambiar": asks an answered group again, in its place. */
export function ChangeAnswerButton({ groupName }: { groupName: string }) {
  const controls = useReviewGroupControls();
  return (
    <Button
      type="button"
      variant="link"
      aria-label={`${REVIEW_COPY.change}: ${groupName}`}
      onClick={controls?.change}
    >
      {REVIEW_COPY.change}
    </Button>
  );
}

/** Closes a group asked again without changing its answer. */
export function KeepAnswerButton() {
  const controls = useReviewGroupControls();
  return (
    <Button type="button" variant="link" onClick={controls?.close}>
      {REVIEW_COPY.keep}
    </Button>
  );
}
