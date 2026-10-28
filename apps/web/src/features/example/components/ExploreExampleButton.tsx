"use client";

import type { AppError, Result } from "@xtrakto/core";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn.utils";
import { exploreExample } from "../actions/explore-example.action";
import { EXAMPLE_COPY as COPY } from "../example.constants";

type ExploreExampleButtonProps = {
  label: string;
  variant: "secondary" | "link";
  /** The button and its message's box. */
  className?: string;
};

/**
 * Opens the example (7.8). The first time it saves the example's data,
 * which takes a moment: meanwhile it keeps its focus and says so. Its
 * action ends by taking the browser to the summary; only a failure comes
 * back, a refusal or an error, and says what to do.
 */
export function ExploreExampleButton({
  label,
  variant,
  className,
}: ExploreExampleButtonProps) {
  const [isPending, setIsPending] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);
  const explore = async () => {
    setHasFailed(false);
    setIsPending(true);
    // Opened, the browser is on its way to the summary, and the action's
    // promise brings nothing. A refusal comes back; an unexpected failure
    // (the database, a new deployment) rejects it.
    const hasOpened = await exploreExample().then(
      (refusal: Result<never, AppError> | undefined) => refusal === undefined,
      () => false,
    );
    if (hasOpened) return;
    setIsPending(false);
    setHasFailed(true);
  };
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Button
        variant={variant}
        onClick={explore}
        disabled={isPending}
        focusableWhenDisabled
      >
        {isPending ? COPY.opening : label}
      </Button>
      {hasFailed && (
        <p role="alert" className="text-caption font-semibold text-danger">
          {COPY.failed}
        </p>
      )}
    </div>
  );
}
