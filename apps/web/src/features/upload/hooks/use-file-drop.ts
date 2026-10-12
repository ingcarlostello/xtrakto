import { useEffect, useRef, useState } from "react";
import type { DragEvent as ReactDragEvent, RefObject } from "react";

type Drag = { readonly dataTransfer: DataTransfer | null };

const isDraggingFiles = ({ dataTransfer }: Drag): boolean =>
  dataTransfer?.types.includes("Files") ?? false;

// Without this, a file dropped outside the zone would make the browser open
// it and leave the page, with the files already chosen.
const useIgnoreDropsOutside = (zoneRef: RefObject<HTMLElement | null>) => {
  useEffect(() => {
    const ignore = (event: DragEvent) => {
      if (!isDraggingFiles(event)) return;
      event.preventDefault();
      const { target, dataTransfer } = event;
      if (target instanceof Node && zoneRef.current?.contains(target)) return;
      if (dataTransfer) dataTransfer.dropEffect = "none";
    };
    window.addEventListener("dragover", ignore);
    window.addEventListener("drop", ignore);
    return () => {
      window.removeEventListener("dragover", ignore);
      window.removeEventListener("drop", ignore);
    };
  }, [zoneRef]);
};

/** Files dragged onto a drop zone, and whether some are over it now. */
export const useFileDrop = (onFiles: (files: readonly File[]) => void) => {
  const zoneRef = useRef<HTMLDivElement>(null);
  const [isOver, setIsOver] = useState(false);
  useIgnoreDropsOutside(zoneRef);

  const zoneProps = {
    onDragOver: (event: ReactDragEvent<HTMLDivElement>) => {
      if (!isDraggingFiles(event)) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
      setIsOver(true);
    },
    onDragLeave: (event: ReactDragEvent<HTMLDivElement>) => {
      const next = event.relatedTarget;
      if (next instanceof Node && event.currentTarget.contains(next)) return;
      setIsOver(false);
    },
    onDrop: (event: ReactDragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsOver(false);
      onFiles([...event.dataTransfer.files]);
    },
  };

  return { zoneRef, isOver, zoneProps };
};
