import { CircleCheck, List } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { FILE_TYPE } from "@/utils/statement-label.constants";
import { FORMATS_COPY as COPY } from "../upload.constants";

const FORMATS = [
  { icon: CircleCheck, copy: COPY.quarterly },
  { icon: List, copy: COPY.movements },
] as const;

// Each format comes in either file.
const FILE_TYPES = [FILE_TYPE.EXCEL, FILE_TYPE.PDF] as const;

// The formats read today, those of a Bancolombia savings account, in Excel or
// PDF (docs/ui/v8-07, without "¿Otro banco?", which Stage 11 brings).
export function SupportedFormats() {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-sm font-bold">{COPY.title}</h3>
      <ul className="grid gap-3 sm:grid-cols-2">
        {FORMATS.map(({ icon: Icon, copy }) => (
          <li
            key={copy.title}
            className="flex flex-col gap-1.5 rounded-md bg-surface-muted p-4"
          >
            <p className="flex items-center gap-2 text-sm font-bold">
              <Icon className="size-[18px]" strokeWidth={1.7} aria-hidden />
              {copy.title}
            </p>
            <p className="text-caption text-ink-muted">{copy.detail}</p>
            <div className="flex flex-wrap gap-1.5">
              {FILE_TYPES.map((type) => (
                <Badge key={type} variant="tag">
                  {type}
                </Badge>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
