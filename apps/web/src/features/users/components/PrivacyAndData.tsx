import { EyeOff, Lock, type LucideIcon, ShieldCheck } from "lucide-react";
import { CsvDownloadButton } from "@/components/csv-download/CsvDownloadButton";
import { Card } from "@/components/ui/card";
import { downloadMyData } from "../actions/download-my-data.action";
import { PRIVACY_AND_DATA_COPY as COPY } from "../user.constants";
import { DeleteAllData } from "./DeleteAllData";

type Fact = keyof typeof COPY.facts;

const FACTS: readonly { id: Fact; icon: LucideIcon }[] = [
  { id: "files", icon: EyeOff },
  { id: "phones", icon: Lock },
  { id: "ads", icon: ShieldCheck },
];

const DELETION_NOTE_ID = "deletion-note";

/**
 * "Privacidad y datos" (docs/ui/v8-11): three facts on what we keep, then
 * "Descargar mis datos (CSV)" (7.6) and "Borrar todos mis datos" (4.5), with
 * the line that says what the deletion takes.
 */
export function PrivacyAndData() {
  return (
    <Card variant="card">
      <h2 className="text-section font-bold">{COPY.title}</h2>
      <ul className="grid gap-3 md:grid-cols-3">
        {FACTS.map(({ id, icon: Icon }) => (
          <li
            key={id}
            className="flex flex-col gap-1 rounded-sm bg-surface-muted p-4"
          >
            <p className="flex items-start gap-2 text-sm font-bold">
              <Icon
                aria-hidden
                strokeWidth={1.7}
                className="mt-px size-[18px] shrink-0"
              />
              {COPY.facts[id].title}
            </p>
            <p className="text-caption text-ink-muted">
              {COPY.facts[id].detail}
            </p>
          </li>
        ))}
      </ul>
      <div className="flex flex-col items-start gap-3 lg:flex-row lg:items-center">
        <CsvDownloadButton label={COPY.download} fetchCsv={downloadMyData} />
        <p
          id={DELETION_NOTE_ID}
          className="text-caption text-ink-muted lg:flex-1"
        >
          {COPY.deletionNote}
        </p>
        <DeleteAllData describedBy={DELETION_NOTE_ID} />
      </div>
    </Card>
  );
}
