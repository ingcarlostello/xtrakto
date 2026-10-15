"use client";

import { type ReactNode, useId, useState } from "react";
import { Button } from "@/components/ui/button";

type ShowMoreListProps = {
  /** The rows, each an `<li>` with its key, rendered on the server. */
  items: readonly ReactNode[];
  /** How many show until the person asks for the rest. */
  first: number;
  moreLabel: string;
  lessLabel: string;
};

/** A list that shows its first rows, and the rest on request. */
export function ShowMoreList({
  items,
  first,
  moreLabel,
  lessLabel,
}: ShowMoreListProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const listId = useId();
  return (
    <div className="flex flex-col">
      <ul id={listId} className="flex flex-col">
        {isExpanded ? items : items.slice(0, first)}
      </ul>
      {items.length > first && (
        <Button
          variant="link"
          className="self-start"
          aria-expanded={isExpanded}
          aria-controls={listId}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? lessLabel : moreLabel}
        </Button>
      )}
    </div>
  );
}
