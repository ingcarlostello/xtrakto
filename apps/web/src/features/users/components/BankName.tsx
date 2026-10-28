import { RawTextChip } from "@/components/raw-text-chip/RawTextChip";
import { Card, CardDescription, CardHeader } from "@/components/ui/card";
import { BANK_NAME_COPY as COPY } from "../user.constants";
import type { YourAccounts } from "../user.types";

// A label over its texts, as the bank printed them, which wrap.
function Texts({ label, texts }: { label: string; texts: readonly string[] }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-caption font-bold">{label}</p>
      <ul aria-label={label} className="flex flex-wrap gap-2">
        {texts.map((text) => (
          <li key={text} className="max-w-full">
            <RawTextChip text={text} />
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * "Cómo te escribe el banco" (docs/ui/v8-11): the holder's name as the
 * statements print it, and the transfers its rules recognized it in, whole
 * or cut (6.2a); until a quarterly statement brings it, where it comes from.
 */
export function BankName({
  holderNames,
  ownNameTexts,
}: Pick<YourAccounts, "holderNames" | "ownNameTexts">) {
  return (
    <Card variant="card">
      <CardHeader>
        <h2 className="text-section font-bold">{COPY.title}</h2>
        <CardDescription>{COPY.description}</CardDescription>
      </CardHeader>
      {holderNames.length === 0 ? (
        <p className="text-caption text-ink-muted">{COPY.none}</p>
      ) : (
        <div className="flex flex-col gap-4 rounded-sm bg-surface-muted p-4">
          <Texts label={COPY.holder} texts={holderNames} />
          {ownNameTexts.length > 0 && (
            <Texts label={COPY.texts} texts={ownNameTexts} />
          )}
        </div>
      )}
    </Card>
  );
}
