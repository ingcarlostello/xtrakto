"use client";

import type { ReactNode } from "react";
import { useMovementSheet } from "../hooks/use-movement-sheet";

type MovementSheetProps = {
  titleId: string;
  rowId: string;
  children: ReactNode;
};

/**
 * The dialog around a movement's detail: in the list's side column from
 * `lg`, and a full-screen sheet below it, modal once the page runs, so the
 * list behind it can't be reached until it closes.
 */
export function MovementSheet({
  titleId,
  rowId,
  children,
}: MovementSheetProps) {
  const { dialogRef, onClose, onKeyDown } = useMovementSheet({
    titleId,
    rowId,
  });
  return (
    <dialog
      ref={dialogRef}
      open
      aria-labelledby={titleId}
      onClose={onClose}
      onKeyDown={onKeyDown}
      className="static m-0 w-full max-w-none border-0 bg-transparent p-0 text-ink max-lg:fixed max-lg:inset-0 max-lg:z-50 max-lg:size-full max-lg:max-h-none max-lg:overflow-y-auto max-lg:overscroll-contain max-lg:bg-bg max-lg:p-4"
    >
      {children}
    </dialog>
  );
}
