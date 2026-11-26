import { CircleCheck, CreditCard, Globe, List } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/utils/cn.utils";
import { FILE_TYPE } from "@/utils/statement-label.constants";
import { FORMATS_COPY as COPY } from "../upload.constants";

type Format = {
  readonly icon: LucideIcon;
  readonly copy: { readonly title: string; readonly detail: string };
  readonly types: readonly string[];
  /** The row's whole width from `sm`. */
  readonly isWide?: boolean;
};

// Bancolombia's formats come in either file, Nu's card in a PDF with its
// password (12.3b); another bank's spreadsheet, as an Excel or a CSV (Stage
// 11).
const BANCOLOMBIA_FILES = [FILE_TYPE.EXCEL, FILE_TYPE.PDF];

const BANCOLOMBIA: readonly Format[] = [
  { icon: CircleCheck, copy: COPY.quarterly, types: BANCOLOMBIA_FILES },
  { icon: List, copy: COPY.movements, types: BANCOLOMBIA_FILES },
  { icon: CreditCard, copy: COPY.card, types: BANCOLOMBIA_FILES, isWide: true },
];

const NU: readonly Format[] = [
  {
    icon: CreditCard,
    copy: COPY.nuCard,
    types: [COPY.lockedPdf],
    isWide: true,
  },
];

const OTHER_BANK: readonly Format[] = [
  {
    icon: Globe,
    copy: COPY.otherBank,
    types: [FILE_TYPE.EXCEL, FILE_TYPE.CSV],
    isWide: true,
  },
];

function FormatList({ formats }: { formats: readonly Format[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {formats.map(({ icon: Icon, copy, types, isWide }) => (
        <li
          key={copy.title}
          className={cn(
            "flex flex-col gap-1.5 rounded-md bg-surface-muted p-4",
            isWide && "sm:col-span-2",
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
  );
}

// The formats read today (docs/ui/v8-07): a Bancolombia savings account's
// and its card's, in Excel or PDF; Nu's card, in a PDF (12.3b); and another
// bank's movements, whose columns the person confirms once.
export function SupportedFormats() {
  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-bold">{COPY.title}</h3>
        <FormatList formats={BANCOLOMBIA} />
      </section>
      <section className="flex flex-col gap-3">
        <h3 className="text-sm font-bold">{COPY.nuTitle}</h3>
        <FormatList formats={NU} />
      </section>
      <FormatList formats={OTHER_BANK} />
    </div>
  );
}
