"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { handFilesToUpload } from "../upload.store";
import { DropZone } from "./DropZone";

/**
 * The drop zone away from the upload screen, on the welcome's last step: the
 * files chosen go to the upload screen, the only one that reads and sends
 * them, in the browser's memory. What goes below it, such as the example,
 * comes as children.
 */
export function UploadShortcut({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  const router = useRouter();
  const takeToUpload = (files: readonly File[]) => {
    if (files.length === 0) return;
    handFilesToUpload(files);
    router.push("/upload");
  };
  return (
    <Card variant="card" className="sm:p-8">
      <h2 className="text-section font-bold text-balance">{title}</h2>
      <DropZone onFiles={takeToUpload} />
      {children}
    </Card>
  );
}
