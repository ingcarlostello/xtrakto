import { CircleCheck, Globe, List } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/utils/cn.utils";
import { FILE_TYPE } from "@/utils/statement-label.constants";
import { FORMATS_COPY as COPY } from "../upload.constants";

// Bancolombia's formats come in either file; another bank's spreadsheet, as
// an Excel or a CSV (Stage 11).
const BANCOLOMBIA_FILES = [FILE_TYPE.EXCEL, FILE_TYPE.PDF] as const;
const OTHER_BANK_FILES = [FILE_TYPE.EXCEL, FILE_TYPE.CSV] as const;

const FORMATS = [
  { icon: CircleCheck, copy: COPY.quarterly, types: BANCOLOMBIA_FILES },
  { icon: List, copy: COPY.movements, types: BANCOLOMBIA_FILES },
  { icon: Globe, copy: COPY.otherBank, types: OTHER_BANK_FILES, isWide: true },
] as const;

// The formats read today (docs/ui/v8-07): a Bancolombia savings account's, in
// Excel or PDF, and another bank's, whose columns the person confirms once.
export function SupportedFormats() {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-sm font-bold">{COPY.title}</h3>
      <ul className="grid gap-3 sm:grid-cols-2">
        {FORMATS.map(({ icon: Icon, copy, types, ...format }) => (
          <li
            key={copy.title}
            className={cn(
              "flex flex-col gap-1.5 rounded-md bg-surface-muted p-4",
              "isWide" in format && "sm:col-span-2",
            )}
          >
            <p className="flex items-center gap-2 text-sm font-bold">
              <Icon className="size-[18px]" strokeWidth={1.7} aria-hidden />
              {copy.title}
            </p>
            <p className="text-caption text-ink-muted">{copy.detail}</p>
            <div className="flex flex-wrap gap-1.5">
              {types.map((type) => (
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
