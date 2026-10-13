import { Upload } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PAGE_COPY } from "./empty-states.constants";

/**
 * The primary action of every empty state: go to the upload screen, the only
 * place where files are uploaded, so it says so.
 */
export function UploadStatementLink() {
  return (
    <Button nativeButton={false} render={<Link href="/upload" />}>
      <Upload aria-hidden strokeWidth={2.2} />
      {PAGE_COPY.uploadAction}
    </Button>
  );
}
