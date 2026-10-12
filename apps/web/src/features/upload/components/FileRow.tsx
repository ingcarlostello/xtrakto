import { Button } from "@/components/ui/button";
import { UPLOAD_COPY as COPY } from "../upload.constants";

type FileRowProps = {
  name: string;
  status: string;
  onRemove: () => void;
};

// A chosen file and how its reading goes. Removing it also stops its reading.
export function FileRow({ name, status, onRemove }: FileRowProps) {
  return (
    <li className="flex items-center gap-4 border-t border-divider py-3.5 first:border-t-0">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="truncate text-body font-bold">{name}</p>
        <p className="text-caption text-ink-muted" aria-live="polite">
          {status}
        </p>
      </div>
      <Button
        variant="link"
        onClick={onRemove}
        aria-label={`${COPY.remove} ${name}`}
      >
        {COPY.remove}
      </Button>
    </li>
  );
}
