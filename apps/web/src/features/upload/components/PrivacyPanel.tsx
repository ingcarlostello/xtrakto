import { EyeOff, ShieldCheck, Smartphone, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { PRIVACY_COPY as COPY } from "../upload.constants";

const FACTS = [
  { icon: ShieldCheck, copy: COPY.reading },
  { icon: EyeOff, copy: COPY.header },
  { icon: Smartphone, copy: COPY.references },
  { icon: Trash2, copy: COPY.deletion },
] as const;

// What leaves the browser and what is kept, next to the upload (v8-07).
export function PrivacyPanel() {
  return (
    <Card variant="card">
      <h2 className="text-section font-bold text-balance">{COPY.title}</h2>
      <ul className="flex flex-col gap-4">
        {FACTS.map(({ icon: Icon, copy }) => (
          <li key={copy.title} className="flex gap-3.5">
            <span className="flex size-9.5 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
              <Icon className="size-[18px]" strokeWidth={1.9} aria-hidden />
            </span>
            <div className="flex flex-col gap-0.5">
              <p className="text-sm font-bold">{copy.title}</p>
              <p className="text-caption text-ink-muted">{copy.detail}</p>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
