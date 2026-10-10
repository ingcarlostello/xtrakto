import { Upload } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PAGE_COPY } from "./empty-states.constants";

/** The primary action of every empty state: go upload a statement. */
export function UploadStatementLink() {
  return (
    <Button nativeButton={false} render={<Link href="/upload" />}>
      <Upload aria-hidden strokeWidth={2.2} />
      {PAGE_COPY.uploadAction}
    </Button>
  );
}
